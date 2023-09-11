# Airtable Driver

This [driver](https://membrane.io) lets you interact with the Airtable API.

## Setup

Create your [Personal access token](https://airtable.com/create/tokens) and add at least the following scopes:
```
data.records:read
data.records:write
schema.bases:read
webhook:manage
```
Invoke the :configure action with the API Token and [Base ID](https://support.airtable.com/docs/understanding-airtable-ids)

```
mctl action 'airtable:configure(API_KEY:"<Token>",BASE_ID:"<BaseId>")'
```

