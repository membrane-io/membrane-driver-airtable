import { state, nodes, root } from "membrane";

const baseUrl = `api.airtable.com/v0`;

type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

state.webhooks = state.webhooks ?? {};

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

  const res = await fetch(`https://${domain}/${path}${querystr}`, {
    method,
    body,
    headers: {
      Authorization: `Bearer ${state.API_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (res.status >= 300) {
    throw new Error(`Airtable Error ${res.status}: ${await res.text()}`);
  }
  return res;
}

export const Root = {
  status() {
    if (!state.API_KEY) {
      return "Please [get an API token](https://airtable.com/create/tokens) and [configure](:configure) it";
    } else if (!state.BASE_ID) {
      return "[Base ID](https://support.airtable.com/docs/understanding-airtable-ids) Not configured";
    } else {
      return `Ready`;
    }
  },
  tables: () => ({}),
  parse: async ({ name, value, url }) => {
    switch (name) {
      case "table": {
        const url = new URL(value);
        const [, , tableId] = url.pathname.split("/");
        return [root.tables.one({ id: tableId })];
      }
      case "record": {
        const source = new URL(url);
        const [, , tableId] = source.pathname.split("/");
        const [, id] = value.match(/data-rowid="([^"]+)"/);
        return [root.tables.one({ id: tableId }).records.one({ id })];
      }
    }
  },
  configure: async ({ API_KEY, BASE_ID }) => {
    state.endpointUrl = state.endpointUrl ?? (await nodes.endpoint);
    state.API_KEY = API_KEY;
    state.BASE_ID = BASE_ID;
    root.statusChanged.$emit();
  },
};

export const Tests = {
  testGetTables: async () => {
    const items = await root.tables.page.items.$query(`{ id }`);
    return Array.isArray(items);
  },
};

export const TableCollection = {
  async one(args) {
    const res = await api("GET", baseUrl, `meta/bases/${state.BASE_ID}/tables`);
    const { tables } = await res.json();

    return tables.find((table) => table.id === args.id);
  },
  async page() {
    const res = await api("GET", baseUrl, `meta/bases/${state.BASE_ID}/tables`);
    const { tables } = await res.json();

    return { items: tables, next: null };
  },
};

export const Table = {
  gref(_, { obj }) {
    return root.tables.one({ id: obj.id });
  },
  records() {
    return {};
  },
  async createRecord({ fields }, { self }) {
    const { id: tableId } = self.$argsAt(root.tables.one);
    const res = await api(
      "POST",
      baseUrl,
      `${state.BASE_ID}/${tableId}`,
      null,
      JSON.stringify({ records: [{ fields }] })
    );
    return await res.json();
  },
  async updateRecord({ id, fields }, { self }) {
    const { id: tableId } = self.$argsAt(root.tables.one);
    const res = await api(
      "PATCH",
      baseUrl,
      `${state.BASE_ID}/${tableId}`,
      null,
      JSON.stringify({
        records: [{ id, fields }],
      })
    );
    return await res.json();
  },
  async replaceRecord({ id, fields }, { self }) {
    const { id: tableId } = self.$argsAt(root.tables.one);
    const res = await api(
      "PUT",
      baseUrl,
      `${state.BASE_ID}/${tableId}`,
      null,
      JSON.stringify({
        records: [{ id, fields }],
      })
    );
    return await res.json();
  },
  async upsertRecord({ fields, fieldsToMergeOn }, { self }) {
    const { id: tableId } = self.$argsAt(root.tables.one);
    const res = await api(
      "PATCH",
      baseUrl,
      `${state.BASE_ID}/${tableId}`,
      null,
      JSON.stringify({
        performUpsert: { fieldsToMergeOn },
        records: [{ fields }],
      })
    );
    return await res.json();
  },
  changed: {
    async subscribe(_, { self }) {
      const { id: tableId } = self.$argsAt(root.tables.one);

      const webhook = await ensureWebhook(tableId);
      state.webhooks[webhook.id] = { ...webhook, cursor: 1, tableId };
    },
    async unsubscribe(_, { self }) {
      const { id: tableId } = self.$argsAt(root.tables.one);
      const webhook: any = Object.keys(state.webhooks)
        .filter((id) => state.webhooks[id].tableId === tableId)
        .map((id) => state.webhooks[id]);
      delete state.webhooks[webhook.id];
      return await api(
        "DELETE",
        baseUrl,
        `bases/${state.BASE_ID}/webhooks/${webhook.id}`
      );
    },
  },
};

export const RecordCollection = {
  async one(args, { self }) {
    const { id } = self.$argsAt(root.tables.one);
    const res = await api("GET", baseUrl, `${state.BASE_ID}/${id}/${args.id}`);

    return await res.json();
  },
  async page(args, { self }) {
    const { id } = self.$argsAt(root.tables.one);
    const res = await api("GET", baseUrl, `${state.BASE_ID}/${id}`, {
      ...args,
    });

    return await res.json();
  },
};

export let RecordPage = {
  next(_, { self, obj }) {
    if (obj.offset === undefined) {
      return null;
    }
    const { id } = self.$argsAt(root.tables.one);
    const args = self.$argsAt(root.tables.one.records.page);
    return root.tables
      .one({ id })
      .records.page({ ...args, offset: obj.offset });
  },
  items(_, { obj }) {
    return obj.records;
  },
};

export const Record = {
  gref(_, { obj, self }) {
    const { id } = self.$argsAt(root.tables.one);

    return root.tables.one({ id }).records.one({ id: obj.id });
  },
  async deleteRecord(_, { self }) {
    const { id: table } = self.$argsAt(root.tables.one);
    const { id } = self.$argsAt(root.tables.one.records.one);
    await api("DELETE", baseUrl, `${state.BASE_ID}/${table}/${id}`);
  },
  async updateRecord({ fields }, { self }) {
    const { id: table } = self.$argsAt(root.tables.one);
    const { id } = self.$argsAt(root.tables.one.records.one);
    await api(
      "PATCH",
      baseUrl,
      `${state.BASE_ID}/${table}/${id}`,
      null,
      JSON.stringify({ fields })
    );
  },
};

export async function endpoint({ path, query, headers, body }) {
  switch (path) {
    case "/incoming-webhook": {
      const event = JSON.parse(body);
      const webhookId = event.webhook.id;
      const config = state.webhooks[webhookId];
      if (!config) {
        throw new Error(`Webhook ${webhookId} is not part of this program`);
      }
      const res = await api(
        "GET",
        baseUrl,
        `bases/${state.BASE_ID}/webhooks/${webhookId}/payloads`,
        { cursor: config.cursor }
      );
      const { payloads, cursor } = await res.json();

      if (config) {
        config.cursor = cursor;
      }

      for (const payload of payloads) {
        if ("changedTablesById" in payload) {
          for (const tableId in payload.changedTablesById) {
            const table = payload.changedTablesById[tableId];
            if ("createdRecordsById" in table) {
              for (const recordId in table.createdRecordsById) {
                dispatchEvent(tableId, recordId, "created");
              }
            }

            if ("changedRecordsById" in table) {
              for (const recordId in table.changedRecordsById) {
                dispatchEvent(tableId, recordId, "changed");
              }
            }

            if ("destroyedRecordIds" in table) {
              for (const recordId in table.destroyedRecordIds) {
                dispatchEvent(tableId, recordId, "destroyed");
              }
            }
          }
        }
      }
      break;
    }
    default:
      console.log("Unknown Endpoint:", path);
  }
}

async function dispatchEvent(tableId: string, recordId: string, type: string) {
  const record: any = root.tables
    .one({ id: tableId })
    .records.one({ id: recordId });
  return root.tables
    .one({ id: tableId })
    .changed.$emit({ record, type: type as any });
}

async function ensureWebhook(tableId: string) {
  const body = {
    notificationUrl: state.endpointUrl + "/incoming-webhook",
    specification: {
      options: {
        filters: {
          dataTypes: ["tableData"],
          recordChangeScope: tableId,
        },
      },
    },
  };
  const res = await api(
    "POST",
    baseUrl,
    `bases/${state.BASE_ID}/webhooks`,
    null,
    JSON.stringify(body)
  );
  const webhook = await res.json();

  if (webhook.id) {
    // refresh in 6 days
    await root.refreshWebhook({ id: webhook.id }).$invokeIn(60 * 60 * 24 * 6);
  }
  return webhook;
}

export async function refreshWebhook({ id }) {
  if (!state.webhooks[id]) {
    return console.log(
      `Error refreshing the webhook ${id}, not found in this program.`
    );
  }
  await api("POST", baseUrl, `bases/${state.BASE_ID}/webhooks/${id}/refresh`);
  // ???
  await root.refreshWebhook({ id }).$invokeIn(60 * 60 * 24 * 6);
}
