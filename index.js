import { encode } from 'querystring'

// TODO: pass this in setup
const API_KEY = 'KEY'
const AIRTABLE_ID = 'AIRTABLE_ID'
const baseUrl = `https://api.airtable.com/v0/${AIRTABLE_ID}`

async function api(method, url, opts) {
  let { body } = opts || {};
  if (body && typeof body === "object") {
    body = JSON.stringify(body);
  }
  const headers = JSON.stringify({
    authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  });
  const resBody = await M.nodes.http.resource({ method, url, headers, body }).body.$get();
  return JSON.parse(resBody)
}

export const Root = {
  table({ args }) {
    return args.name
  },
}

export const Table = {
  name({ self }) {
    const { name } = self.$argsAt(M.root.table())
    return name
  },
  records() {
    return {}
  },
  async createRecord({ args, self }) {
    const { name } = self.$argsAt(M.root.table)
    const fields = JSON.parse(args.fields)
    await api('POST', `${baseUrl}/${name}`, { body: { records: [{ fields }] } });
  },
  async deleteRecord({ args, self }) {
    const { name } = self.$argsAt(M.root.table)
    await api('DELETE', `${baseUrl}/${name}?records[]=${args.id}`);
  },
  async updateRecord({ args, self }) {
    const { name } = self.$argsAt(M.root.table)
    const fields = JSON.parse(args.fields)
    await api('PATCH', `${baseUrl}/${name}`, { body: { records: [{ id: args.id, fields }] } });
  },
}

export const RecordCollection = {
  async one({ args, self }) {
    const { name } = self.$argsAt(M.root.table())
    return await api('GET', `${baseUrl}/${name}/${args.id}`);
  },
  async page({ args, self }) {
    const { name } = self.$argsAt(M.root.table)
    return await api('GET', `${baseUrl}/${name}?${encode(args)}`);
  },
}

export let RecordPage = {
  next({ self, obj }) {
    if (obj.offset === undefined) {
      return null
    }
    const { name } = self.$argsAt(M.root.table())
    const args = self.$argsAt(M.root.table().records().page())
    return M.root.table({ name }).records().page({ ...args, offset: obj.offset })
  },
  items({ obj }) {
    return obj.records
  },
}

export const Record = {
  self({ obj, self, parent }) {
    const { id } = obj
    if (id === undefined || id === null) {
      return null
    }
    if (self) {
      return self;
    }
    const { name } = parent.$argsAt(M.root.table())
    return parent.ref.pop().pop().push('one', { id: id })
  },
  fields({ obj }) {
    return JSON.stringify(obj.fields)
  },
}
