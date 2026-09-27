export type PushMockCall = {
  subscription: unknown;
  payload: string;
};

export function createWebPushTransportMock() {
  const calls: PushMockCall[] = [];

  return {
    calls,
    async sendNotification(subscription: unknown, payload: string) {
      calls.push({ subscription, payload });
    },
  };
}
