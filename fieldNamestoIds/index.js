/*

1. Get Fields from Table using Metadata API
2. Create an object to match fieldIds to Names
3. Get data from table using Airtable.js, which will be returned with fieldNames
4. Replace fieldNames from Airtable.js output with fieldIds

*/

// Load external dependencies
const axios = require('axios');
const Airtable = require('airtable');
require('dotenv').config();

// Read in environment variable values
const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID } = process.env;

// Base info
const appId = AIRTABLE_BASE_ID;
airtableBase = Airtable.base(appId);

// Config Airtable
Airtable.configure({ apiKey: AIRTABLE_API_KEY });

// Initialize Axios client, used for Metadata APIs
const axiosClient = axios.create({
  baseURL: `https://api.airtable.com/v0/`,
  headers: {
    Authorization: `Bearer ${AIRTABLE_API_KEY}`,
  },
});

// Get Base Metadata
let tableFieldMappings = [];
let tableData = [];

// Immediately invoked anonymous async function containing runtime logic
(async function () {
  async function getFieldInfo(appId) {
    // Get list of tables for base
    const baseMetadataRequest = await axiosClient.get(
      `meta/bases/${appId}/tables`
    );
    const tables = baseMetadataRequest.data.tables;
    console.log(`\tFound ${tables.length} tables for base`);

    // Get list of fieldIDs and Names for each Table
    for (const table of tables) {
      console.debug(
        `\tProcessing field info for table ${table.id} -- ("${table.name}")`
      );
      const allFieldsResponse = table.fields;

      // Create an array that holds the field id, name, and type
      let fieldNameIdMappings = allFieldsResponse.map((field) => ({
        id: field.id,
        name: field.name,
        type: field.type,
      }));

      // For each table, create an object with the fieldNameIdMappings array
      let obj = {
        table: { name: table.name, id: table.id },
        fields: fieldNameIdMappings,
      };

      // Add to the tableFieldMappingsArray
      await tableFieldMappings.push(obj);
    }

    // Loop through each table in the base and get table data with record and field names
    for (const table of tables) {
      console.debug(`\tProcessing table ${table.id} ("${table.name}")`);
      const allRecordsResponse = await airtableBase(table.id).select({}).all();
      const allRecords = allRecordsResponse.map((r) => r._rawJson);
      tableData.push({ name: table.name, id: table.id, records: allRecords });
      console.debug(`\t\tFound ${allRecords.length} records`);
    }

    // Replace Field Names with Field IDs in each table
    for (let table of tableData) {
      // Find the corresponding table in the tableFieldMappings Array
      let index = tableData.indexOf(table);
      let fieldsToMap = tableFieldMappings[index].fields;

      // Access the records
      let records = table.records;

      // For each record, isolate the field/value pairs
      records.forEach((rec) => {
        let recordFields = rec.fields;
        let fieldNames = Object.keys(recordFields);

        // For each field name listed, find the corresponding field ID form the fieldsToMap array,
        // replace the field name with the found field id, and delete the original FieldName/Value pair
        fieldNames.forEach((fn) => {
          let fieldId = fieldsToMap.find((ftm) => ftm.name === fn).id;
          delete Object.assign(recordFields, { [fieldId]: recordFields[fn] })[
            fn
          ];
        });
      });
    }
  }
  await getFieldInfo(appId);
  let result = tableData.map((t) => t.records.map((r) => r.fields));
  console.log(result);
})();
