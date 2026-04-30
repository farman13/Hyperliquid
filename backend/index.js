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
// ⚠️ TEMP ONLY (MOVE TO ENV LATER)
// =====================================
const AGENT_PRIVATE_KEY = "0xfc60e9916e912e71d7fdb31d9bab2446a03dd4fdfef6b1e3098fb092f731f373";

if (!AGENT_PRIVATE_KEY || !AGENT_PRIVATE_KEY.startsWith("0x")) {
    throw new Error("❌ Invalid private key");
}

const agentWallet = privateKeyToAccount(AGENT_PRIVATE_KEY);

// =====================================
// CLIENTS
// =====================================
const transport = new HttpTransport({ isTestnet: true });

const infoClient = new InfoClient({ transport });

const exchangeClient = new ExchangeClient({
    transport,
    wallet: agentWallet
});

// =====================================
// SYMBOL CONVERTER
// =====================================
let converter = null;

// =====================================
// 🧠 VALIDATION
// =====================================
function validateTrade({ coin, isLong, size, leverage }) {
    if (!coin || typeof coin !== "string") return "Invalid coin";
    if (typeof isLong !== "boolean") return "Invalid side";
    if (!size || isNaN(size) || Number(size) <= 0) return "Invalid size";
    if (!leverage || isNaN(leverage) || Number(leverage) <= 0) return "Invalid leverage";

    return null;
}

// =====================================
// 🚀 TRADE ENDPOINT
// =====================================
app.post("/trade", async (req, res) => {
    try {
        const { coin, isLong, size, leverage } = req.body;

        console.log("📥 Incoming trade:", req.body);

        // ✅ Hyperliquid-style:
        // size = coin/base amount, example:
        // BTC size = 0.001
        // ETH size = 0.05
        const error = validateTrade({ coin, isLong, size, leverage });
        if (error) {
            return res.status(400).json({ error });
        }

        if (!converter) {
            return res.status(500).json({
                error: "System not ready"
            });
        }

        // =====================================
        // 🎯 ASSET MAPPING
        // =====================================
        const assetId = converter.getAssetId(coin);
        const szDecimals = converter.getSzDecimals(coin);

        if (assetId === undefined || szDecimals === undefined) {
            return res.status(400).json({
                error: "Invalid asset"
            });
        }

        // =====================================
        // ⚙️ SET LEVERAGE
        // =====================================
        await exchangeClient.updateLeverage({
            asset: assetId,
            isCross: true,
            leverage: Number(leverage)
        });

        // =====================================
        // 💰 GET MARKET PRICE
        // =====================================
        const mids = await infoClient.allMids();
        const mid = Number(mids[coin]);

        if (!mid || isNaN(mid)) {
            return res.status(400).json({
                error: "Invalid market price"
            });
        }

        // =====================================
        // 📊 MARKET ORDER SIMULATION
        // Hyperliquid has no market order type.
        // Use aggressive IOC limit order.
        // =====================================
        const tolerance = 0.01;
        const price = mid * (isLong ? 1 + tolerance : 1 - tolerance);

        const formattedPrice = formatPrice(price, szDecimals);

        // ✅ IMPORTANT:
        // Do NOT convert USD -> coin here.
        // Frontend sends coin amount directly.
        const formattedSize = formatSize(String(size), szDecimals);

        if (!formattedSize || Number(formattedSize) <= 0) {
            return res.status(400).json({
                error: "Invalid order size after formatting"
            });
        }

        console.log("📊 Order:", {
            coin,
            assetId,
            isLong,
            leverage,
            mid,
            formattedPrice,
            formattedSize,
            notionalUsd: Number(formattedSize) * mid
        });

        // =====================================
        // 🚀 PLACE ORDER
        // =====================================
        const result = await exchangeClient.order({
            orders: [{
                a: assetId,
                b: isLong,
                p: formattedPrice,
                s: formattedSize,
                r: false,
                t: { limit: { tif: "Ioc" } },
            }],
            grouping: "na",

            // Builder fee configuration
            builder: {
                b: "0xB7c94Ac7C1C16744E9f3cDDEC09F54920D2C39B8",
                f: 100, // 1 bp = 0.01%
            },
        });

        console.log("✅ Trade result:", result);

        res.json({
            success: true,
            result,
            meta: {
                coin,
                side: isLong ? "LONG" : "SHORT",
                size: formattedSize,
                price: formattedPrice,
                notionalUsd: Number(formattedSize) * mid,
                leverage: Number(leverage)
            }
        });

    } catch (err) {
        console.error("❌ TRADE ERROR:", err);

        if (err?.message?.includes("does not exist")) {
            return res.status(400).json({
                error: "User not onboarded. Deposit funds first."
            });
        }

        if (err?.message?.includes("Must deposit")) {
            return res.status(400).json({
                error: "No funds in Hyperliquid account"
            });
        }

        res.status(500).json({
            error: err.message || "trade failed"
        });
    }
});

// =====================================
// 📊 PRICES
// =====================================
app.get("/prices", async (req, res) => {
    try {
        const mids = await infoClient.allMids();
        res.json(mids);
    } catch (err) {
        res.status(500).json({
            error: "price fetch failed"
        });
    }
});

// =====================================
// 💰 BALANCE
// =====================================
app.get("/balance/:address", async (req, res) => {
    try {
        const { address } = req.params;

        const state = await infoClient.clearinghouseState({
            user: address
        });

        const balance =
            state?.marginSummary?.accountValue || "0";

        res.json({
            address,
            balance
        });

    } catch (err) {
        console.error("❌ BALANCE ERROR:", err);

        if (err?.message?.includes("does not exist")) {
            return res.json({
                address: req.params.address,
                balance: "0"
            });
        }

        res.status(500).json({
            error: err.message
        });
    }
});

app.get("/debug-state/:address", async (req, res) => {
    try {
        const { address } = req.params;

        const state = await infoClient.clearinghouseState({
            user: address,
        });

        res.json(state);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/builder-stats/:address", async (req, res) => {
    try {
        const { address } = req.params;

        const result = await infoClient.referral({
            user: address,
        });

        res.json(result);
    } catch (err) {
        console.error("❌ BUILDER STATS ERROR:", err);

        res.status(500).json({
            error: err.message || "failed to fetch builder stats",
        });
    }
});

// =====================================
// 📈 POSITIONS
// =====================================
app.get("/positions/:address", async (req, res) => {
    try {
        const { address } = req.params;

        const state = await infoClient.clearinghouseState({
            user: address
        });

        const positions = state?.assetPositions || [];

        res.json({
            address,
            positions
        });

    } catch (err) {
        console.error("❌ POSITIONS ERROR:", err);

        res.status(500).json({
            error: err.message
        });
    }
});

// =====================================
// ❌ CLOSE POSITION
// =====================================
app.post("/close-position", async (req, res) => {
    try {
        const { coin, address } = req.body;

        if (!coin) {
            return res.status(400).json({ error: "coin required" });
        }

        if (!address) {
            return res.status(400).json({ error: "user address required" });
        }

        if (!converter) {
            return res.status(500).json({ error: "system not ready" });
        }

        const assetId = converter.getAssetId(coin);
        const szDecimals = converter.getSzDecimals(coin);

        if (assetId === undefined || szDecimals === undefined) {
            return res.status(400).json({ error: "invalid asset" });
        }

        // ✅ positions are on USER/master wallet, not agent wallet
        const state = await infoClient.clearinghouseState({
            user: address,
        });

        const position = state.assetPositions.find(
            (p) => p.position.coin === coin
        );

        if (!position || Number(position.position.szi) === 0) {
            return res.json({
                success: false,
                message: "No open position",
            });
        }

        const rawSize = Number(position.position.szi);
        const closeSize = Math.abs(rawSize);
        const isLong = rawSize > 0;

        const mids = await infoClient.allMids();
        const mid = Number(mids[coin]);

        if (!mid || isNaN(mid)) {
            return res.status(400).json({ error: "invalid market price" });
        }

        const tolerance = 0.01;

        // long close = sell below mid
        // short close = buy above mid
        const price = mid * (isLong ? 1 - tolerance : 1 + tolerance);

        const formattedPrice = formatPrice(price, szDecimals);
        const formattedSize = formatSize(String(closeSize), szDecimals);

        const result = await exchangeClient.order({
            orders: [{
                a: assetId,
                b: !isLong,
                p: formattedPrice,
                s: formattedSize,
                r: true, // reduce-only
                t: { limit: { tif: "Ioc" } },
            }],
            grouping: "na",
        });

        res.json({
            success: true,
            closed: true,
            coin,
            sideClosed: isLong ? "LONG" : "SHORT",
            size: formattedSize,
            price: formattedPrice,
            result,
        });

    } catch (err) {
        console.error("❌ CLOSE ERROR:", err);

        res.status(500).json({
            error: err.message || "close failed",
        });
    }
});
// =====================================
// ❤️ HEALTH CHECK
// =====================================
app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

// =====================================
// 🚀 START SERVER
// =====================================
async function startServer() {
    try {
        console.log("⏳ Initializing...");

        converter = await SymbolConverter.create({ transport });

        console.log("✅ Symbol converter ready");

        const PORT = process.env.PORT || 3000;

        app.listen(PORT, () => {
            console.log(`🚀 Backend running on port ${PORT}`);
        });

    } catch (err) {
        console.error("❌ INIT ERROR:", err);
    }
}

startServer();