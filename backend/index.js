import express from "express";
import cors from "cors";

import {
    HttpTransport,
    InfoClient,
    ExchangeClient
} from "@nktkas/hyperliquid";

import {
    formatPrice,
    formatSize,
    SymbolConverter
} from "@nktkas/hyperliquid/utils";

import { privateKeyToAccount } from "viem/accounts";

const app = express();
app.use(cors());
app.use(express.json());

// =====================================
// ✅ AGENT WALLET (SERVER SIDE ONLY)
// =====================================
const AGENT_PRIVATE_KEY = "0xfc60e9916e912e71d7fdb31d9bab2446a03dd4fdfef6b1e3098fb092f731f373";
const agentWallet = privateKeyToAccount(AGENT_PRIVATE_KEY);

// =====================================
// ✅ TRANSPORT + CLIENTS
// =====================================
const transport = new HttpTransport({ isTestnet: true });

const infoClient = new InfoClient({ transport });
const exchangeClient = new ExchangeClient({
    transport,
    wallet: agentWallet
});

// =====================================
// ✅ SYMBOL CONVERTER
// =====================================
let converter;

(async () => {
    converter = await SymbolConverter.create({ transport });
    console.log("✅ Symbol converter ready");
})();


// =====================================
// 🚀 TRADE ENDPOINT
// =====================================
app.post("/trade", async (req, res) => {
    try {
        const { coin, isLong, size } = req.body;

        if (!converter) {
            return res.status(500).json({ error: "converter not ready" });
        }

        // 1️⃣ get mid price
        const mids = await infoClient.allMids();
        const mid = parseFloat(mids[coin]);

        if (!mid) {
            return res.status(400).json({ error: "Invalid coin" });
        }

        // 2️⃣ simulate market (IOC)
        const tolerance = 0.01;
        const price = mid * (isLong ? 1 + tolerance : 1 - tolerance);

        // 3️⃣ asset mapping
        const assetId = converter.getAssetId(coin);
        const szDecimals = converter.getSzDecimals(coin);

        if (assetId === undefined) {
            return res.status(400).json({ error: "Invalid asset" });
        }

        // 4️⃣ place order
        const result = await exchangeClient.order({
            orders: [{
                a: assetId,
                b: isLong,
                p: formatPrice(price, szDecimals),
                s: formatSize(String(size), szDecimals),
                r: false,
                t: { limit: { tif: "Ioc" } }, // market order
            }],
            grouping: "na",
        });

        res.json({
            success: true,
            result
        });

    } catch (err) {
        console.error("TRADE ERROR:", err);

        res.status(500).json({
            error: err.message || "trade failed"
        });
    }
});


// =====================================
// 📊 PRICE ENDPOINT
// =====================================
app.get("/prices", async (req, res) => {
    try {
        const mids = await infoClient.allMids();
        res.json(mids);
    } catch (err) {
        res.status(500).json({ error: "price fetch failed" });
    }
});

// ===============================
// 💰 BALANCE ENDPOINT
// ===============================
// ===============================
// 💰 BALANCE ENDPOINT
// ===============================
app.get("/balance/:address", async (req, res) => {
    try {
        const { address } = req.params;

        const state = await infoClient.clearinghouseState({
            user: address
        });

        const usdcBalance =
            state?.marginSummary?.accountValue || "0";

        res.json({
            address,
            balance: usdcBalance
        });

    } catch (err) {
        console.error("BALANCE ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => {
    console.log("🚀 Backend running on port 3000");
});
