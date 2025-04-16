import { ErgoHDKey } from "@fleet-sdk/wallet";

/**
 * Representation of an Ergo box from the explorer API
 */
export interface ExplorerErgoBox {
  boxId: string;
  value: string;
  ergoTree: string;
  creationHeight: number;
  assets: Array<{
    tokenId: string;
    amount: string;
  }>;
  additionalRegisters: Record<string, string>;
  transactionId: string;
  index: number;
}

/**
 * Wallet data for Ergo operations
 */
export interface InitializedWallet {
  address: string;
  hdKey: ErgoHDKey;
}
