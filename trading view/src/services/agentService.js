import { ExchangeClient, HttpTransport } from "@nktkas/hyperliquid";
import { createWalletClient, custom } from "viem";
import { arbitrum } from "viem/chains";

export const approveAgent = async (agentAddress) => {
    try {
        // ✅ Step 1: Request MetaMask access
        const accounts = await window.ethereum.request({
            method: "eth_requestAccounts",
        });

        const account = accounts[0]; // ✅ actual authorized account

        // ✅ Step 2: create wallet client WITH account
        const wallet = createWalletClient({
            chain: arbitrum,
            transport: custom(window.ethereum),
            account, // ✅ now properly authorized
        });

        const client = new ExchangeClient({
            transport: new HttpTransport(),
            wallet,
        });

        // ✅ Step 3: approve agent (this will trigger SIGN popup)
        await client.approveAgent({
            agentAddress,
            agentName: "my-agent",
        });

        return { success: true };

    } catch (err) {
        console.error("APPROVE ERROR:", err);
        throw err;
    }
};