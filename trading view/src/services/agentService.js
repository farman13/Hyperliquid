import { ExchangeClient, HttpTransport } from "@nktkas/hyperliquid";
import { createWalletClient, custom } from "viem";
import { arbitrum } from "viem/chains";

// ✅ pick MetaMask specifically (avoid Phantom hijack)
const getMetaMaskProvider = () => {
    if (!window.ethereum) {
        throw new Error("No wallet found");
    }

    // multiple wallets installed
    if (window.ethereum.providers) {
        const metamask = window.ethereum.providers.find(
            (p) => p.isMetaMask
        );
        if (metamask) return metamask;
    }

    // single provider case
    if (window.ethereum.isMetaMask) {
        return window.ethereum;
    }

    throw new Error("MetaMask not found. Disable Phantom or select MetaMask.");
};

export const approveAgent = async (agentAddress) => {
    try {
        // ✅ Step 1: force MetaMask provider
        const provider = getMetaMaskProvider();

        // ✅ Step 2: request account from MetaMask
        const accounts = await provider.request({
            method: "eth_requestAccounts",
        });

        const account = accounts[0];

        if (!account) {
            throw new Error("No account connected");
        }

        // ✅ Step 3: create wallet client (IMPORTANT)
        const wallet = createWalletClient({
            chain: arbitrum,
            transport: custom(provider),
            account,
        });

        const client = new ExchangeClient({
            transport: new HttpTransport({ isTestnet: true }),
            wallet,
        });

        // ✅ Step 4: approve agent (triggers MetaMask popup)
        await client.approveAgent({
            agentAddress,
            agentName: "bigrock-agent",
        });

        return { success: true };

    } catch (err) {
        console.error("APPROVE ERROR:", err);

        // 👇 better UX errors
        if (err.message.includes("MetaMask not found")) {
            alert("Please use MetaMask (disable Phantom wallet)");
        }

        if (err.message.includes("User rejected")) {
            alert("❌ Signature rejected");
        }

        throw err;
    }
};