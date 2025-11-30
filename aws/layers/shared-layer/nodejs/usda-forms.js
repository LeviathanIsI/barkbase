/**
 * =============================================================================
 * BarkBase USDA Form Generation
 * =============================================================================
 *
 * Generate USDA-required forms for animal welfare compliance
 *
 * USDA Forms supported:
 * - APHIS Form 7001: Report of Animals on Hand
 * - APHIS Form 7002: Record of Acquisition and Disposition
 * - APHIS Form 7005: Record of Veterinary Care
 *
 * Supports both JSON data export and PDF generation
 *
 * =============================================================================
 */

const PDFDocument = require('pdfkit');

/**
 * Generate APHIS Form 7001 - Report of Animals on Hand
 * Required annually for licensed facilities
 */
function generateForm7001(facilityData, animalsData, reportDate) {
  const form = {
    formId: 'APHIS-7001',
    formName: 'Report of Animals on Hand',
    generatedAt: new Date().toISOString(),
    reportDate: reportDate || new Date().toISOString().split('T')[0],
    
    // Facility Information
    facility: {
      name: facilityData.name,
      licenseNumber: facilityData.licenseNumber,
      address: facilityData.address,
      city: facilityData.city,
      state: facilityData.state,
      zipCode: facilityData.zipCode,
      phone: facilityData.phone,
      email: facilityData.email,
    },
    
    // Animals on Hand by Species
    animalsOnHand: [],
    
    // Summary Statistics
    summary: {
      totalAnimals: 0,
      bySpecies: {},
    },
  };
  
  // Group animals by species
  const speciesGroups = {};
  for (const animal of animalsData) {
    const species = (animal.species || 'dog').toLowerCase();
    if (!speciesGroups[species]) {
      speciesGroups[species] = [];
    }
    speciesGroups[species].push(animal);
  }
  
  // Build animals on hand list
  for (const [species, animals] of Object.entries(speciesGroups)) {
    const speciesEntry = {
      species: species.charAt(0).toUpperCase() + species.slice(1),
      count: animals.length,
      animals: animals.map(a => ({
        id: a.id,
        name: a.name,
        breed: a.breed,
        dateOfBirth: a.birthDate || a.birth_date,
        sex: a.gender || a.sex,
        microchipNumber: a.microchipNumber || a.microchip_number,
        ownerName: a.ownerName,
        dateReceived: a.dateReceived || a.created_at,
      })),
    };
    
    form.animalsOnHand.push(speciesEntry);
    form.summary.totalAnimals += animals.length;
    form.summary.bySpecies[species] = animals.length;
  }
  
  return form;
}

/**
 * Generate APHIS Form 7002 - Record of Acquisition and Disposition
 * Required for tracking animal movements
 */
function generateForm7002(facilityData, transactions, startDate, endDate) {
  const form = {
    formId: 'APHIS-7002',
    formName: 'Record of Acquisition and Disposition',
    generatedAt: new Date().toISOString(),
    reportPeriod: {
      start: startDate,
      end: endDate,
    },
    
    // Facility Information
    facility: {
      name: facilityData.name,
      licenseNumber: facilityData.licenseNumber,
      address: facilityData.address,
      city: facilityData.city,
      state: facilityData.state,
      zipCode: facilityData.zipCode,
    },
    
    // Acquisitions (check-ins)
    acquisitions: [],
    
    // Dispositions (check-outs)
    dispositions: [],
    
    // Summary
    summary: {
      totalAcquisitions: 0,
      totalDispositions: 0,
      netChange: 0,
    },
  };
  
  for (const transaction of transactions) {
    const record = {
      date: transaction.date,
      animalId: transaction.petId || transaction.animal_id,
      animalName: transaction.petName || transaction.animal_name,
      species: transaction.species || 'Dog',
      breed: transaction.breed,
      sex: transaction.sex || transaction.gender,
      age: transaction.age,
      sourceOrDestination: transaction.ownerName || transaction.owner_name,
      address: transaction.ownerAddress,
      licenseNumber: transaction.ownerLicense || null,
      bookingId: transaction.bookingId || transaction.booking_id,
    };
    
    if (transaction.type === 'checkin' || transaction.type === 'acquisition') {
      form.acquisitions.push(record);
      form.summary.totalAcquisitions++;
    } else if (transaction.type === 'checkout' || transaction.type === 'disposition') {
      form.dispositions.push(record);
      form.summary.totalDispositions++;
    }
  }
  
  form.summary.netChange = form.summary.totalAcquisitions - form.summary.totalDispositions;
  
  return form;
}

/**
 * Generate APHIS Form 7005 - Record of Veterinary Care
 * Required for tracking veterinary treatments and health records
 */
function generateForm7005(facilityData, veterinaryRecords, startDate, endDate) {
  const form = {
    formId: 'APHIS-7005',
    formName: 'Record of Veterinary Care',
    generatedAt: new Date().toISOString(),
    reportPeriod: {
      start: startDate,
      end: endDate,
    },
    
    // Facility Information
    facility: {
      name: facilityData.name,
      licenseNumber: facilityData.licenseNumber,
      address: facilityData.address,
    },
    
    // Attending Veterinarian
    attendingVeterinarian: {
      name: facilityData.vetName || 'On File',
      licenseNumber: facilityData.vetLicense,
      phone: facilityData.vetPhone,
      address: facilityData.vetAddress,
    },
    
    // Veterinary Records
    records: [],
    
    // Summary
    summary: {
      totalRecords: 0,
      byType: {},
    },
  };
  
  for (const record of veterinaryRecords) {
    const vetRecord = {
      date: record.date,
      animalId: record.petId || record.animal_id,
      animalName: record.petName || record.animal_name,
      species: record.species || 'Dog',
      breed: record.breed,
      
      // Treatment details
      treatmentType: record.type || record.treatment_type,
      description: record.description,
      medication: record.medication,
      dosage: record.dosage,
      frequency: record.frequency,
      duration: record.duration,
      
      // Veterinarian performing treatment
      treatingVeterinarian: record.veterinarian,
      
      // Follow-up
      followUpRequired: record.followUpRequired,
      followUpDate: record.followUpDate,
      notes: record.notes,
    };
    
    form.records.push(vetRecord);
    form.summary.totalRecords++;
    
    const type = vetRecord.treatmentType || 'other';
    form.summary.byType[type] = (form.summary.byType[type] || 0) + 1;
  }
  
  return form;
}

/**
 * Generate vaccination compliance report
 * Shows current vaccination status for all animals
 */
function generateVaccinationComplianceReport(facilityData, animals, vaccinations) {
  const report = {
    reportId: 'VAC-COMPLIANCE',
    reportName: 'Vaccination Compliance Report',
    generatedAt: new Date().toISOString(),
    
    facility: {
      name: facilityData.name,
      licenseNumber: facilityData.licenseNumber,
    },
    
    summary: {
      totalAnimals: animals.length,
      compliant: 0,
      nonCompliant: 0,
      expiringSoon: 0, // Within 30 days
    },
    
    animals: [],
  };
  
  const today = new Date();
  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  // Group vaccinations by pet
  const vaccByPet = {};
  for (const vacc of vaccinations) {
    const petId = vacc.petId || vacc.pet_id;
    if (!vaccByPet[petId]) {
      vaccByPet[petId] = [];
    }
    vaccByPet[petId].push(vacc);
  }
  
  for (const animal of animals) {
    const petVaccs = vaccByPet[animal.id] || [];
    
    // Check compliance status
    let status = 'compliant';
    let expiringSoonCount = 0;
    
    const vaccStatus = petVaccs.map(v => {
      const expDate = new Date(v.expirationDate || v.expiration_date);
      let vaccStatus = 'valid';
      
      if (expDate < today) {
        vaccStatus = 'expired';
        status = 'non_compliant';
      } else if (expDate <= thirtyDaysFromNow) {
        vaccStatus = 'expiring_soon';
        expiringSoonCount++;
      }
      
      return {
        vaccineName: v.vaccineName || v.vaccine_name,
        vaccinationDate: v.vaccinationDate || v.vaccination_date,
        expirationDate: v.expirationDate || v.expiration_date,
        status: vaccStatus,
      };
    });
    
    const animalRecord = {
      id: animal.id,
      name: animal.name,
      species: animal.species || 'Dog',
      breed: animal.breed,
      ownerName: animal.ownerName,
      status,
      vaccinations: vaccStatus,
      expiringSoonCount,
    };
    
    report.animals.push(animalRecord);
    
    if (status === 'compliant') {
      report.summary.compliant++;
      if (expiringSoonCount > 0) {
        report.summary.expiringSoon++;
      }
    } else {
      report.summary.nonCompliant++;
    }
  }
  
  return report;
}

/**
 * Generate facility inspection checklist
 * USDA-style inspection preparation checklist
 */
function generateInspectionChecklist(facilityData) {
  return {
    checklistId: 'INSP-CHECKLIST',
    checklistName: 'Facility Inspection Preparation Checklist',
    generatedAt: new Date().toISOString(),
    
    facility: {
      name: facilityData.name,
      licenseNumber: facilityData.licenseNumber,
    },
    
    sections: [
      {
        name: 'Structural Standards',
        items: [
          { id: 'struct_1', description: 'Indoor housing facilities structurally sound', required: true },
          { id: 'struct_2', description: 'Surfaces impervious to moisture', required: true },
          { id: 'struct_3', description: 'Adequate drainage for liquid waste', required: true },
          { id: 'struct_4', description: 'Outdoor facilities properly fenced', required: true },
        ],
      },
      {
        name: 'Space Requirements',
        items: [
          { id: 'space_1', description: 'Primary enclosures meet minimum space requirements', required: true },
          { id: 'space_2', description: 'Dogs able to make normal postural adjustments', required: true },
          { id: 'space_3', description: 'Exercise plans documented for dogs', required: true },
        ],
      },
      {
        name: 'Sanitation',
        items: [
          { id: 'san_1', description: 'Cleaning schedule documented and followed', required: true },
          { id: 'san_2', description: 'Food and water receptacles cleaned daily', required: true },
          { id: 'san_3', description: 'Pest control program in place', required: true },
          { id: 'san_4', description: 'Waste disposal documented', required: true },
        ],
      },
      {
        name: 'Veterinary Care',
        items: [
          { id: 'vet_1', description: 'Attending veterinarian documented', required: true },
          { id: 'vet_2', description: 'Written program of veterinary care', required: true },
          { id: 'vet_3', description: 'Individual health records maintained', required: true },
          { id: 'vet_4', description: 'Vaccination records current', required: true },
        ],
      },
      {
        name: 'Record Keeping',
        items: [
          { id: 'rec_1', description: 'Form 7001 (Animals on Hand) current', required: true },
          { id: 'rec_2', description: 'Form 7002 (Acquisition/Disposition) maintained', required: true },
          { id: 'rec_3', description: 'Form 7005 (Veterinary Care) maintained', required: true },
          { id: 'rec_4', description: 'Records retained for required period (3 years)', required: true },
        ],
      },
    ],
  };
}

// =============================================================================
// PDF GENERATION FUNCTIONS
// =============================================================================

/**
 * Helper: Draw PDF header with facility info
 */
function drawPDFHeader(doc, formId, formName, facility) {
  // Title
  doc.fontSize(18).font('Helvetica-Bold')
    .text(formName, { align: 'center' });
  doc.fontSize(12).font('Helvetica')
    .text(`Form ${formId}`, { align: 'center' });
  doc.moveDown(0.5);

  // Facility info box
  doc.rect(50, doc.y, 500, 80).stroke();
  const boxY = doc.y + 10;
  doc.fontSize(10).font('Helvetica-Bold')
    .text('Facility Information:', 60, boxY);
  doc.font('Helvetica')
    .text(`Name: ${facility.name || 'N/A'}`, 60, boxY + 15)
    .text(`License #: ${facility.licenseNumber || 'N/A'}`, 300, boxY + 15)
    .text(`Address: ${facility.address || ''}, ${facility.city || ''}, ${facility.state || ''} ${facility.zipCode || ''}`, 60, boxY + 30)
    .text(`Phone: ${facility.phone || 'N/A'}`, 60, boxY + 45)
    .text(`Email: ${facility.email || 'N/A'}`, 300, boxY + 45);

  doc.y = boxY + 70;
  doc.moveDown();
}

/**
 * Helper: Draw table header
 */
function drawTableHeader(doc, columns, startX, startY, colWidths) {
  doc.fontSize(9).font('Helvetica-Bold');
  let x = startX;
  columns.forEach((col, i) => {
    doc.text(col, x, startY, { width: colWidths[i], align: 'left' });
    x += colWidths[i];
  });
  doc.moveTo(startX, startY + 12).lineTo(startX + colWidths.reduce((a, b) => a + b, 0), startY + 12).stroke();
  return startY + 15;
}

/**
 * Helper: Draw table row
 */
function drawTableRow(doc, values, startX, startY, colWidths) {
  doc.fontSize(8).font('Helvetica');
  let x = startX;
  values.forEach((val, i) => {
    const text = val !== null && val !== undefined ? String(val).substring(0, 30) : '';
    doc.text(text, x, startY, { width: colWidths[i], align: 'left' });
    x += colWidths[i];
  });
  return startY + 12;
}

/**
 * Generate PDF for Form 7001 - Report of Animals on Hand
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateForm7001PDF(facilityData, animalsData, reportDate) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    const buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Header
    drawPDFHeader(doc, 'APHIS-7001', 'Report of Animals on Hand', facilityData);

    // Report date
    doc.fontSize(10).text(`Report Date: ${reportDate || new Date().toISOString().split('T')[0]}`, { align: 'right' });
    doc.moveDown();

    // Group animals by species
    const speciesGroups = {};
    for (const animal of animalsData) {
      const species = (animal.species || 'Dog').toLowerCase();
      if (!speciesGroups[species]) speciesGroups[species] = [];
      speciesGroups[species].push(animal);
    }

    // Summary box
    doc.fontSize(11).font('Helvetica-Bold').text('Summary', 50, doc.y);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Total Animals on Hand: ${animalsData.length}`);
    for (const [species, animals] of Object.entries(speciesGroups)) {
      doc.text(`  ${species.charAt(0).toUpperCase() + species.slice(1)}: ${animals.length}`);
    }
    doc.moveDown();

    // Animals table
    const columns = ['Name', 'Species', 'Breed', 'Sex', 'DOB', 'Microchip', 'Owner'];
    const colWidths = [70, 50, 80, 35, 60, 80, 100];
    let y = drawTableHeader(doc, columns, 50, doc.y, colWidths);

    for (const animal of animalsData) {
      if (y > 700) {
        doc.addPage();
        y = drawTableHeader(doc, columns, 50, 50, colWidths);
      }
      y = drawTableRow(doc, [
        animal.name,
        animal.species || 'Dog',
        animal.breed,
        animal.gender || animal.sex,
        animal.birthDate || animal.birth_date || '',
        animal.microchipNumber || animal.microchip_number || '',
        animal.ownerName || '',
      ], 50, y, colWidths);
    }

    // Footer
    doc.fontSize(8).text(`Generated: ${new Date().toISOString()}`, 50, 750, { align: 'center' });

    doc.end();
  });
}

/**
 * Generate PDF for Form 7002 - Record of Acquisition and Disposition
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateForm7002PDF(facilityData, transactions, startDate, endDate) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    const buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Header
    drawPDFHeader(doc, 'APHIS-7002', 'Record of Acquisition and Disposition', facilityData);

    // Report period
    doc.fontSize(10).text(`Report Period: ${startDate} to ${endDate}`, { align: 'right' });
    doc.moveDown();

    // Separate acquisitions and dispositions
    const acquisitions = transactions.filter(t => t.type === 'checkin' || t.type === 'acquisition');
    const dispositions = transactions.filter(t => t.type === 'checkout' || t.type === 'disposition');

    // Summary
    doc.fontSize(11).font('Helvetica-Bold').text('Summary');
    doc.fontSize(10).font('Helvetica');
    doc.text(`Total Acquisitions (Check-ins): ${acquisitions.length}`);
    doc.text(`Total Dispositions (Check-outs): ${dispositions.length}`);
    doc.text(`Net Change: ${acquisitions.length - dispositions.length}`);
    doc.moveDown();

    // Acquisitions table
    doc.fontSize(11).font('Helvetica-Bold').text('Acquisitions');
    const acqCols = ['Date', 'Animal', 'Species', 'Breed', 'Source/Owner'];
    const acqWidths = [70, 80, 60, 80, 180];
    let y = drawTableHeader(doc, acqCols, 50, doc.y, acqWidths);

    for (const t of acquisitions) {
      if (y > 700) {
        doc.addPage();
        y = drawTableHeader(doc, acqCols, 50, 50, acqWidths);
      }
      y = drawTableRow(doc, [
        t.date,
        t.petName || t.animal_name,
        t.species || 'Dog',
        t.breed,
        t.ownerName || t.owner_name,
      ], 50, y, acqWidths);
    }
    doc.moveDown();

    // Dispositions table
    doc.fontSize(11).font('Helvetica-Bold').text('Dispositions');
    y = drawTableHeader(doc, acqCols, 50, doc.y, acqWidths);

    for (const t of dispositions) {
      if (y > 700) {
        doc.addPage();
        y = drawTableHeader(doc, acqCols, 50, 50, acqWidths);
      }
      y = drawTableRow(doc, [
        t.date,
        t.petName || t.animal_name,
        t.species || 'Dog',
        t.breed,
        t.ownerName || t.owner_name,
      ], 50, y, acqWidths);
    }

    // Footer
    doc.fontSize(8).text(`Generated: ${new Date().toISOString()}`, 50, 750, { align: 'center' });

    doc.end();
  });
}

/**
 * Generate PDF for Form 7005 - Record of Veterinary Care
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateForm7005PDF(facilityData, veterinaryRecords, startDate, endDate) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    const buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Header
    drawPDFHeader(doc, 'APHIS-7005', 'Record of Veterinary Care', facilityData);

    // Report period
    doc.fontSize(10).text(`Report Period: ${startDate} to ${endDate}`, { align: 'right' });
    doc.moveDown();

    // Attending veterinarian
    doc.fontSize(11).font('Helvetica-Bold').text('Attending Veterinarian');
    doc.fontSize(10).font('Helvetica');
    doc.text(`Name: ${facilityData.vetName || 'On File'}`);
    doc.text(`License: ${facilityData.vetLicense || 'On File'}`);
    doc.text(`Phone: ${facilityData.vetPhone || 'On File'}`);
    doc.moveDown();

    // Summary
    doc.fontSize(11).font('Helvetica-Bold').text('Summary');
    doc.fontSize(10).font('Helvetica');
    doc.text(`Total Records: ${veterinaryRecords.length}`);
    doc.moveDown();

    // Veterinary records table
    doc.fontSize(11).font('Helvetica-Bold').text('Veterinary Records');
    const cols = ['Date', 'Animal', 'Treatment', 'Medication', 'Notes'];
    const colWidths = [60, 70, 90, 90, 160];
    let y = drawTableHeader(doc, cols, 50, doc.y, colWidths);

    for (const record of veterinaryRecords) {
      if (y > 700) {
        doc.addPage();
        y = drawTableHeader(doc, cols, 50, 50, colWidths);
      }
      y = drawTableRow(doc, [
        record.date,
        record.petName || record.animal_name,
        record.type || record.treatment_type,
        record.medication,
        record.notes,
      ], 50, y, colWidths);
    }

    // Footer
    doc.fontSize(8).text(`Generated: ${new Date().toISOString()}`, 50, 750, { align: 'center' });

    doc.end();
  });
}

module.exports = {
  // JSON data generators
  generateForm7001,
  generateForm7002,
  generateForm7005,
  generateVaccinationComplianceReport,
  generateInspectionChecklist,
  // PDF generators
  generateForm7001PDF,
  generateForm7002PDF,
  generateForm7005PDF,
};

