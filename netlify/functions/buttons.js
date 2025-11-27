const Airtable = require("airtable");

// v1.0.1 - Force a change for Netlify cache
// Make sure to set these in your Netlify site settings
const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME } = process.env;

const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);
const table = base(AIRTABLE_TABLE_NAME);

exports.handler = async (event, context) => {
  const { httpMethod, path, body } = event;
  // This removes the function path prefix to isolate the API endpoint part
  const pathParts = path
    .replace("/.netlify/functions/buttons", "")
    .split("/")
    .filter(Boolean);

  // GET /api/buttons
  if (httpMethod === "GET" && pathParts.length === 0) {
    try {
      const records = await table
        .select({ sort: [{ field: "sort_order", direction: "asc" }] })
        .all();
      const buttons = records.map((record) => ({
        id: record.id,
        ...record.fields,
      }));
      return {
        statusCode: 200,
        body: JSON.stringify({ data: buttons }),
      };
    } catch (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to fetch buttons" }),
      };
    }
  }

  // POST /api/buttons
  if (httpMethod === "POST" && pathParts[0] !== "reorder") {
    try {
      const newRecord = await table.create([{ fields: JSON.parse(body) }]);
      return {
        statusCode: 201,
        body: JSON.stringify({ id: newRecord[0].id }),
      };
    } catch (error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Failed to create button" }),
      };
    }
  }

  // PUT /api/buttons/:id
  if (httpMethod === "PUT" && pathParts.length === 1) {
    const id = pathParts[0];
    try {
      const updatedRecord = await table.update([
        { id, fields: JSON.parse(body) },
      ]);
      return {
        statusCode: 200,
        body: JSON.stringify({ changes: updatedRecord.length }),
      };
    } catch (error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Failed to update button" }),
      };
    }
  }

  // DELETE /api/buttons/:id
  if (httpMethod === "DELETE" && pathParts.length === 1) {
    const id = pathParts[0];
    try {
      await table.destroy([id]);
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "deleted" }),
      };
    } catch (error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Failed to delete button" }),
      };
    }
  }

  // POST /api/buttons/reorder
  if (httpMethod === "POST" && pathParts[0] === "reorder") {
    const { order } = JSON.parse(body);
    const recordsToUpdate = order.map((id, index) => ({
      id,
      fields: { sort_order: index },
    }));

    try {
      await table.update(recordsToUpdate);
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Reordered successfully" }),
      };
    } catch (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to reorder" }),
      };
    }
  }

  return {
    statusCode: 404,
    body: "Not Found",
  };
};
