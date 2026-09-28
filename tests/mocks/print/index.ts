export type PrintMockCall = {
  documentName: string;
};

/** Print boundary: records intent and never accesses a physical printer. */
export function createPrintTransportMock() {
  const calls: PrintMockCall[] = [];

  return {
    calls,
    async print(documentName: string) {
      calls.push({ documentName });
      return { printed: false, simulated: true };
    },
  };
}
