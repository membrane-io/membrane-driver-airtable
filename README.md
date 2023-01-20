# Airtable Driver

This [driver](https://membrane.io) lets you interact with the Airtable API.
## Actions

Create your [Personal access token](https://airtable.com/create/tokens) and add the following scopes:
```
data.records:read
data.records:write
schema.bases:read
webhook:manage
```
Configure the connector to use the Token and [Base ID](https://support.airtable.com/docs/understanding-airtable-ids)


$~~~~$ `mctl action 'airtable:configure(API_KEY:"<Token>",BASE_ID:"<BaseId>")'`

# Schema

### Types
```javascript
<Root>
    - Fields
        table -> Ref <Table>
        status() -> String
    - Events
        onComand(token) -> <CommandEvent>
<Table>
    - Fields
        name -> String
        records -> <RecordCollections>
    - Actions
        createRecord(fields) -> Int
        deleteRecord(id) -> Int
        updateRecord(id, dields) -> Int
<RecordCollections>
    - Fields
       one(id) -> <Record>
       page -> <RecordPage>
<RecordPage>
    - Fields
        items -> List[] <Record>
        next -> <RecordPage>
<Record>
    - Fields
       id -> String
       createdTime -> String
       fields -> String