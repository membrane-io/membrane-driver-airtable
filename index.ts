import fetch from "node-fetch";
import { state, nodes, root } from "membrane";

const baseUrl = `api.airtable.com/v0`;

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
  tables: () => ({}),
  configure: async ({ args: { API_KEY, BASE_ID } }) => {
    state.endpointUrl = state.endpointUrl ?? (await nodes.endpoint.$get());
    state.API_KEY = API_KEY;
    state.BASE_ID = BASE_ID;
  },
};

export const TableCollection = {
  async one({ args, self }) {
    const res = await api("GET", baseUrl, `meta/bases/${state.BASE_ID}/tables`);
    const { tables } = await res.json();

    return tables.find((table) => table.id === args.id);
  },
  async page({ args, self }) {
    const res = await api("GET", baseUrl, `meta/bases/${state.BASE_ID}/tables`);
    const { tables } = await res.json();

    return { items: tables, next: null };
  },
};

export const Table = {
  gref({ obj, self }) {
    return root.tables.one({ id: obj.id });
  },
  records() {
    return {};
  },
  async createRecord({ args, self }) {
    const { id } = self.$argsAt(root.tables.one);
    const fields = JSON.parse(args.fields);
    await api(
      "POST",
      baseUrl,
      `${id}`,
      null,
      JSON.stringify({ records: [{ fields }] })
    );
  },
  async createWebhook({ args, self }) {
    const { id } = self.$argsAt(root.tables.one);
    const body = {
      notificationUrl: state.endpointUrl + "/receivewebhook",
      specification: {
        options: {
          filters: {
            dataTypes: ["tableData"],
            recordChangeScope: id,
          },
        },
      },
    };
    await api(
      "POST",
      baseUrl,
      `bases/${state.BASE_ID}/webhooks`,
      null,
      JSON.stringify(body)
    );
  },
};

export const RecordCollection = {
  async one({ args, self }) {
    const { id } = self.$argsAt(root.tables.one);
    const res = await api("GET", baseUrl, `${state.BASE_ID}/${id}/${args.id}`);

    return await res.json();
  },
  async page({ args, self }) {
    const { id } = self.$argsAt(root.tables.one);
    const res = await api("GET", baseUrl, `${state.BASE_ID}/${id}`, {
      ...args,
    });

    return await res.json();
  },
};

export let RecordPage = {
  next({ self, obj }) {
    if (obj.offset === undefined) {
      return null;
    }
    const { id } = self.$argsAt(root.tables.one);
    const args = self.$argsAt(root.tables.one.records.one);
    return root.tables.one({ id }).records.page({ ...args, offset: obj.offset });
  },
  items({ obj }) {
    return obj.records;
  },
};

export const Record = {
  gref({ obj, self }) {
    const { id } = self.$argsAt(root.tables.one);

    return root.tables.one({ id }).records.one({ id: obj.id });
  },
  async deleteRecord({ args, self }) {
    const { id: table } = self.$argsAt(root.tables.one);
    const { id } = self.$argsAt(root.tables.one.records.one);
    await api("DELETE", baseUrl, `${state.BASE_ID}/${table}/${id}`);
  },
  async updateRecord({ args, self }) {
    const { id: table } = self.$argsAt(root.tables.one);
    const { id } = self.$argsAt(root.tables.one.records.one);
    const fields = JSON.parse(args.fields);
    await api(
      "PATCH",
      baseUrl,
      `${state.BASE_ID}/${table}/${id}`,
      null,
      JSON.stringify({ fields })
    );
  },
  fields({ obj }) {
    return JSON.stringify(obj.fields);
  },
};

export async function endpoint({ args: { path, query, headers, body } }) {
  switch (path) {
    case "/receivewebhook": {
      let event = JSON.parse(body);
      const res = await api(
        "GET",
        baseUrl,
        `bases/${state.BASE_ID}/webhooks/${event.webhook.id}/payloads`
      );
      // Get all payloads from the webhook
      const { payloads } = await res.json();
      // Get the last payload
      const lastPayload = payloads.pop();
      // Get the ids of the table, change and record
      const [tableId] = Object.keys(lastPayload.changedTablesById);
      const [changeName] = Object.keys(lastPayload.changedTablesById[tableId]);
      const [recordId] = Object.keys(lastPayload.changedTablesById[tableId][changeName]);
      const record: any = root.tables.one({ id: tableId }).records.one({ id: recordId });
      // Emit the event based on the action
      switch (changeName) {
        case "createdRecordsById":
          root.tables.one({ id: tableId }).recordCreated.$emit({ record,  type: "created" });
          break;
        case "changedRecordsById":
          root.tables.one({ id: tableId }).recordChanged.$emit({ record, type: "changed" });
          break;
        default:
          break;
      }
      break;
    }
    default:
      console.log("Unknown Endpoint:", path);
  }
}
