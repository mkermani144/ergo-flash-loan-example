import { compile } from "@fleet-sdk/compiler";
import { Network } from "@fleet-sdk/core";
import { Result, Ok, Err } from "ts-results-es";

const script = `
{
  val selfBox = SELF
  val flashLoanValidation = {
    val borrowedAmount = SELF.value
    val repaymentAmount = borrowedAmount + (borrowedAmount / 100) // 1% fee
    val repaid = OUTPUTS.exists({ (box: Box) =>
      box.propositionBytes == SELF.propositionBytes &&
      box.value >= repaymentAmount
    })
    repaid
  }
  sigmaProp(flashLoanValidation)
}
`;

/**
 * Compiles the flash loan contract
 * @returns Promise containing the compiled contract
 */
export const compileFlashLoanContract = async (): Promise<
  Result<string, Error>
> => {
  try {
    const compileOutput = await compile(script);
    const contractAddress = compileOutput.toAddress(Network.Mainnet).toString();
    return Ok(contractAddress);
  } catch (error) {
    return Err(
      error instanceof Error
        ? error
        : new Error("Failed to compile flash loan contract")
    );
  }
};
