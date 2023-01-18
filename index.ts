import fetch from "node-fetch";
import { state, nodes, root } from "membrane";

const baseUrl = `api.airtable.com/v0/${state.BASE_ID}`;

type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

async function api(
  method: Method,
  domain: string,
  path: string,
  query?: any,
  body?: string
) {
  if (!state.API_KEY) {
    throw new Error("You must authenticated to use this API.");
  }
  if (query) {
    Object.keys(query).forEach((key) =>
      query[key] === undefined ? delete query[key] : {}
    );
  }

  const querystr =
    query && Object.keys(query).length ? `?${new URLSearchParams(query)}` : "";

  return await fetch(`https://${domain}/${path}${querystr}`, {
    method,
    body,
    headers: {
      Authorization: `Bearer ${state.API_KEY}`,
      "Content-Type": "application/json",
    },
  });
}

export const Root = {
  status() {
    if (!state.API_KEY) {
      return "Please [configure the Airtable token](https://airtable.com/account)";
    } else if (!state.BASE_ID) {
      return "[Base ID](https://support.airtable.com/docs/understanding-airtable-ids) Not configured";
    } else {
      return `Ready`;
    }
  },
  table({ args }) {
    return args.name;
  },
  configure: ({ args: { API_KEY, BASE_ID } }) => {
    state.API_KEY = API_KEY;
    state.BASE_ID = BASE_ID;
  },
};

export const Table = {
  name({ self }) {
    const { name } = self.$argsAt(root.table);
    return name;
  },
  records() {
    return {};
  },
  async createRecord({ args, self }) {
    const { name } = self.$argsAt(root.table);
    const fields = JSON.parse(args.fields);
    await api(
      "POST",
      baseUrl,
      `${name}`,
      null,
      JSON.stringify({ records: [{ fields }] })
    );
  },
};

export const RecordCollection = {
  async one({ args, self }) {
    const { name } = self.$argsAt(root.table);
    const res = await api("GET", baseUrl, `${name}/${args.id}`);

    return await res.json();
  },
  async page({ args, self }) {
    const { name } = self.$argsAt(root.table);
    const res = await api("GET", baseUrl, `${name}`, { ...args });

    return await res.json();
  },
};

export let RecordPage = {
  next({ self, obj }) {
    if (obj.offset === undefined) {
      return null;
    }
    const { name } = self.$argsAt(root.table);
    const args = self.$argsAt(root.table.records.page);
    return root.table({ name }).records.page({ ...args, offset: obj.offset });
  },
  items({ obj }) {
    return obj.records;
  },
};

export const Record = {
  gref({ obj, self }) {
    const { name } = self.$argsAt(root.table);

    return root.table({ name }).records.one({ id: obj.id });
  },
  async deleteRecord({ args, self }) {
    const { name } = self.$argsAt(root.table);
    const { id } = self.$argsAt(root.table.records.one);
    await api("DELETE", baseUrl, `${name}/${id}`);
  },
  async updateRecord({ args, self }) {
    const { name } = self.$argsAt(root.table);
    const { id } = self.$argsAt(root.table.records.one);
    const fields = JSON.parse(args.fields);
    await api(
      "PATCH",
      baseUrl,
      `${name}/${id}`,
      null,
      JSON.stringify({ fields })
    );
  },
  fields({ obj }) {
    return JSON.stringify(obj.fields);
  },
};
