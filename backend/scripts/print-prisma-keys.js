const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const keys = Object.keys(prisma).filter((k) => !k.startsWith('$'));
  console.log(JSON.stringify(keys, null, 2));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


