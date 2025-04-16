/**
 * Box representation for selector use with blockchain operations
 */
export interface SelectorFriendlyErgoBox {
  boxId: string;
  value: bigint;
  ergoTree: string;
  creationHeight: number;
  assets: Array<{
    tokenId: string;
    amount: bigint;
  }>;
  additionalRegisters: Record<string, string>;
  transactionId: string;
  index: number;
}
