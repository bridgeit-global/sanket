export type WhatsAppMockCall = {
  recipient: string;
  message: string;
};

export function createWhatsAppSenderMock() {
  const calls: WhatsAppMockCall[] = [];

  return {
    calls,
    async send(recipient: string, message: string) {
      calls.push({ recipient, message });
      return { accepted: true };
    },
  };
}
