# Airtable Driver

This [driver](https://membrane.io) lets you interact with the Airtable API.

## Setup

Create your [Personal access token](https://airtable.com/create/tokens) and add the following scopes:
```
data.records:read
data.records:write
schema.bases:read
webhook:manage
```
Invoke the :configure action with the API Token and [Base ID](https://support.airtable.com/docs/understanding-airtable-ids)

$~~~~$ `mctl action 'airtable:configure(API_KEY:"<Token>",BASE_ID:"<BaseId>")'`

# Schema

### Types
```javascript
<Root>
    - Fields
        table -> Ref <Table>
        status() -> String
<Table>
    - Fields
        id -> String
        name -> String
        primaryFieldId -> String
        records -> Ref <RecordCollections>
    - Actions
        createRecord(fields) -> Void
    - Events
        changed() -> Ref <TableEvent>
<RecordCollections>
    - Fields
       one(id) -> Ref <Record>
       page -> Ref <RecordPage>
<RecordPage>
    - Fields
        items -> List[] <Record>
        next -> Ref <RecordPage>
<Record>
    - Fields
       id -> String
       createdTime -> String
       fields -> String
    - Actions 
        deleteRecord() -> Void
        updateRecord(fields) -> Void
<TableEvent>
    - Fields
        type -> String
        record -> Ref <Record>