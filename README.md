# Slack Connector

This [driver](https://membrane.io) lets you interact with the Airtable API.

## Usage

1. Install the [Membrane VSCode Extension](https://marketplace.visualstudio.com/items?itemName=membrane.membrane).
2. Setup on extension your [Membrane's CLI binary (mctl)](https://membrane.io/download) path.
3. Login / Sign up with ```mctl login```.
4. Update the program on Membrane with the VSCode Command palette `(cmd+shift+p)`\
  ```> Membrame: Update current program```

## Actions

Configure the connector to use your [API Key](https://airtable.com/account) and [Base ID](https://support.airtable.com/docs/understanding-airtable-ids)

$~~~~$ `mctl action 'airtable:configure(API_KEY:"", BASE_ID"")'`

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