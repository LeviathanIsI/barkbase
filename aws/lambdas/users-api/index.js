// This Lambda function will be attached to the 'db-layer'
// The 'pg' and 'bcryptjs' libraries will be available.
const { getPool } = require("db-layer");
const bcrypt = require("bcryptjs");

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
  "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,DELETE",
};

exports.handler = async (event) => {

  const httpMethod = event.requestContext.http.method;
  const path = event.requestContext.http.path;

  // A simple router
  try {
    if (httpMethod === "GET" && event.pathParameters?.id) {
      return await getUserById(event);
    }
    if (httpMethod === "GET" && path === "/users") {
      return await listUsers(event);
    }
    if (httpMethod === "POST" && path === "/users") {
      return await createUser(event);
    }
    if (httpMethod === "PUT" && event.pathParameters?.id) {
      return await updateUser(event);
    }
    if (httpMethod === "DELETE" && event.pathParameters?.id) {
      return await deleteUser(event);
    }

    return {
      statusCode: 404,
      headers: HEADERS,
      body: JSON.stringify({ message: "Not Found" }),
    };
  } catch (error) {
    console.error("Error processing request:", error);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({
        message: "Internal Server Error",
        error: error.message,
      }),
    };
  }
};

const getUserById = async (event) => {
  // Note: In a real implementation, authorization logic will be added here
  // to check if the requesting user (from the JWT) is allowed to view the
  // requested user's data, likely by checking for a shared tenant in the
  // Membership table.

  const userId = event.pathParameters.id;
  if (!userId) {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({ message: "User ID is missing from path" }),
    };
  }

  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT "recordId", "email", "name", "phone", "avatarUrl", "createdAt" FROM "User" WHERE "recordId" = $1',
    [userId]
  );

  if (rows.length === 0) {
    return {
      statusCode: 404,
      headers: HEADERS,
      body: JSON.stringify({ message: "User not found" }),
    };
  }

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify(rows[0]),
  };
};

const listUsers = async (event) => {
  // Note: This is a simplified list function. A production implementation
  // would filter users by tenant based on the requester's memberships.
  const limit = parseInt(event.queryStringParameters?.limit) || 20;
  const offset = parseInt(event.queryStringParameters?.offset) || 0;

  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT "recordId", "email", "name", "createdAt" FROM "User" ORDER BY "createdAt" DESC LIMIT $1 OFFSET $2',
    [limit, offset]
  );

  // Also get the total count for pagination headers
  const { rows: countRows } = await pool.query('SELECT COUNT(*) FROM "User"');
  const totalCount = parseInt(countRows[0].count, 10);

  return {
    statusCode: 200,
    headers: {
      ...HEADERS,
      "X-Total-Count": totalCount,
    },
    body: JSON.stringify(rows),
  };
};

const createUser = async (event) => {
  const body = JSON.parse(event.body);
  const { email, password, name, phone } = body;

  if (!email || !password) {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({ message: "Email and password are required" }),
    };
  }

  // Hash the password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const pool = getPool();
  try {
    const { rows } = await pool.query(
      'INSERT INTO "User" ("recordId", "email", "passwordHash", "name", "phone", "updatedAt") VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW()) RETURNING "recordId", "email", "name", "createdAt"',
      [email, passwordHash, name, phone]
    );

    return {
      statusCode: 201,
      headers: HEADERS,
      body: JSON.stringify(rows[0]),
    };
  } catch (error) {
    // Check for unique constraint violation (duplicate email)
    if (error.code === "23505") {
      return {
        statusCode: 409,
        headers: HEADERS,
        body: JSON.stringify({
          message: "A user with this email already exists",
        }),
      };
    }
    throw error; // Rethrow other errors to be caught by the main handler
  }
};

const updateUser = async (event) => {
  const userId = event.pathParameters.id;
  const body = JSON.parse(event.body);
  const { name, phone, avatarUrl, timezone, language, preferences } = body;

  // Dynamically build the update query
  const fields = [];
  const values = [];
  let paramCount = 1;

  if (name !== undefined) {
    fields.push(`"name" = $${paramCount++}`);
    values.push(name);
  }
  if (phone !== undefined) {
    fields.push(`"phone" = $${paramCount++}`);
    values.push(phone);
  }
  if (avatarUrl !== undefined) {
    fields.push(`"avatarUrl" = $${paramCount++}`);
    values.push(avatarUrl);
  }
  if (timezone !== undefined) {
    fields.push(`"timezone" = $${paramCount++}`);
    values.push(timezone);
  }
  if (language !== undefined) {
    fields.push(`"language" = $${paramCount++}`);
    values.push(language);
  }
  if (preferences !== undefined) {
    fields.push(`"preferences" = $${paramCount++}`);
    values.push(JSON.stringify(preferences));
  }

  if (fields.length === 0) {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({ message: "No valid fields provided for update" }),
    };
  }

  const setClause = fields.join(", ");
  const query = `UPDATE "User" SET ${setClause} WHERE "recordId" = $${paramCount} RETURNING "recordId", "email", "name", "phone", "avatarUrl", "updatedAt"`;
  values.push(userId);

  const pool = getPool();
  const { rows } = await pool.query(query, values);

  if (rows.length === 0) {
    return {
      statusCode: 404,
      headers: HEADERS,
      body: JSON.stringify({ message: "User not found" }),
    };
  }

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify(rows[0]),
  };
};

const deleteUser = async (event) => {
  const userId = event.pathParameters.id;

  const pool = getPool();
  const { rowCount } = await pool.query(
    'DELETE FROM "User" WHERE "recordId" = $1',
    [userId]
  );

  if (rowCount === 0) {
    return {
      statusCode: 404,
      headers: HEADERS,
      body: JSON.stringify({ message: "User not found" }),
    };
  }

  return {
    statusCode: 204, // No Content
    headers: HEADERS,
    body: "",
  };
};
