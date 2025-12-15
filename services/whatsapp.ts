const WHATSAPP_API_URL = `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_ID}/messages`;

export async function sendFlightRequestAlert({
  to,
  payload,
}: {
  to: string;
  payload: {
    clientName: string;
    departureCity: string;
    arrivalCity: string;
    travelDate: string;
    clientPhone?: string;
    clientEmail?: string;
    requestId: string;
  };
}) {
  const res = await fetch(WHATSAPP_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: "flight_request_alert",
        //name:"hello_world",
        language: { code: "en_US" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: payload.clientName },
              { type: "text", text: payload.departureCity },
              { type: "text", text: payload.arrivalCity },
              { type: "text", text: payload.travelDate },
              { type: "text", text: payload.clientPhone || "-" },
              { type: "text", text: payload.clientEmail || "-" },
            ],
          },
          {
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [{ type: "text", text: payload.requestId }],
          },
        ],
      },
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("WhatsApp API error:", data);
    throw new Error(JSON.stringify(data));
  }
  return data;
}
