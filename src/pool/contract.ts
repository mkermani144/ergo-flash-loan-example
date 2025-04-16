import { compile } from "@fleet-sdk/compiler";
import { Network } from "@fleet-sdk/core";
import { Result, Ok, Err } from "ts-results-es";

const script = `
{
  val selfBox = SELF
  val poolValidation = {
    val poolAmount = SELF.value
    val poolBox = OUTPUTS.exists({ (box: Box) =>
      box.propositionBytes == SELF.propositionBytes &&
      box.value >= poolAmount
    })
    poolBox
  }
  sigmaProp(poolValidation)
}
`;

/**
 * Compiles the pool contract
 * @returns Promise containing the compiled contract address
 */
export const compilePoolContract = async (): Promise<Result<string, Error>> => {
  try {
    const compileOutput = await compile(script);
    const contractAddress = compileOutput.toAddress(Network.Mainnet).toString();
    return Ok(contractAddress);
  } catch (error) {
    return Err(
      error instanceof Error
        ? error
        : new Error("Failed to compile pool contract")
    );
  }
};
