import React, { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { usePrices } from "../hooks/usePrices";
import { placeTrade } from "../services/tradeService";
import { approveAgent } from "../services/agentService";
import { useBalance } from "../hooks/useBalance";

const TradePanel = () => {
    const { isConnected, address } = useAccount();
    const prices = usePrices();
    const balance = useBalance();

    const [activeTab, setActiveTab] = useState("long");
    const [orderType, setOrderType] = useState("market");
    const [tpSlEnabled, setTpSlEnabled] = useState(false);

    const [leverage, setLeverage] = useState(5);
    const [margin, setMargin] = useState("");
    const [size, setSize] = useState("");
    const [coin, setCoin] = useState("BTC");

    const [loading, setLoading] = useState(false);
    const [approving, setApproving] = useState(false);

    // 🔥 IMPORTANT: put your REAL agent address here
    const AGENT_ADDRESS = "0x4A04b217a88BAEEEbc6A726A6411Ce2A74176fC2";

    // ===============================
    // ✅ APPROVE AGENT (MetaMask SIGN)
    // ===============================
    const handleApproveAgent = async () => {
        try {
            if (!address) {
                alert("Connect wallet first");
                return;
            }

            setApproving(true);


            await approveAgent(AGENT_ADDRESS);
            alert("✅ Agent Approved Successfully!");
        } catch (err) {
            console.error("APPROVE ERROR:", err);
            alert("❌ Agent approval failed");
        } finally {
            setApproving(false);
        }
    };

    // ===============================
    // 🚀 EXECUTE TRADE
    // ===============================
    const handleTrade = async () => {
        try {
            setLoading(true);

            const res = await placeTrade({
                coin,
                isLong: activeTab === "long",
                size: Number(size),
                leverage: Number(leverage),
            });

            console.log("TRADE RESULT:", res);

            if (res?.error) {
                alert("❌ Trade failed: " + res.error);
            } else {
                alert("✅ Trade executed!");
            }

        } catch (err) {
            console.log("TRADE ERROR:", err);
            alert("❌ Trade error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full bg-[#0b1220] text-white p-4 border border-[#1e293b] shadow-xl">

            {/* LIVE PRICE */}
            <div className="text-xs text-gray-400 mb-2">
                BTC Price: ${prices?.BTC || "loading..."}
            </div>


            <div className="text-xs text-gray-400 mb-2">
                Balance: ${balance || "loading..."}
            </div>

            {/* 🔥 APPROVE AGENT BUTTON */}
            {isConnected && (
                <button
                    onClick={handleApproveAgent}
                    disabled={approving}
                    className="w-full bg-yellow-500 text-black py-2 rounded mb-3 font-semibold"
                >
                    {approving ? "Approving..." : "Approve Agent"}
                </button>
            )}

            {/* CONTROLS */}
            <div className="flex gap-2 mb-4">

                <select
                    value={leverage}
                    onChange={(e) => setLeverage(Number(e.target.value))}
                    className="bg-[#111827] px-3 py-2 rounded-lg text-sm w-1/3"
                >
                    <option value={2}>2x</option>
                    <option value={5}>5x</option>
                    <option value={10}>10x</option>
                </select>

                <select
                    value={coin}
                    onChange={(e) => setCoin(e.target.value)}
                    className="bg-[#111827] px-3 py-2 rounded-lg text-sm w-1/3"
                >
                    <option value="BTC">BTC</option>
                    <option value="ETH">ETH</option>
                    <option value="SOL">SOL</option>
                </select>

                <select className="bg-[#111827] px-3 py-2 rounded-lg text-sm w-1/3">
                    <option>USDC</option>
                </select>
            </div>

            {/* LONG SHORT */}
            <div className="flex bg-[#111827] rounded-xl overflow-hidden mb-4">
                <button
                    onClick={() => setActiveTab("long")}
                    className={`flex-1 py-2 ${activeTab === "long"
                        ? "bg-green-500 text-black"
                        : "text-gray-400"
                        }`}
                >
                    Long
                </button>

                <button
                    onClick={() => setActiveTab("short")}
                    className={`flex-1 py-2 ${activeTab === "short"
                        ? "bg-red-500 text-black"
                        : "text-gray-400"
                        }`}
                >
                    Short
                </button>
            </div>

            {/* ORDER TYPE */}
            <div className="flex gap-4 mb-4 text-sm">
                {["market", "limit"].map((type) => (
                    <button
                        key={type}
                        onClick={() => setOrderType(type)}
                        className={`${orderType === type ? "text-blue-400" : "text-gray-500"}`}
                    >
                        {type}
                    </button>
                ))}
            </div>

            {/* MARGIN */}
            <input
                type="number"
                placeholder="Margin (USDC)"
                value={margin}
                onChange={(e) => setMargin(e.target.value)}
                className="w-full p-2 bg-[#111827] rounded mb-3"
            />

            {/* SIZE */}
            <input
                type="number"
                placeholder="Size (USD)"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full p-2 bg-[#111827] rounded mb-3"
            />

            {/* SLIDER */}
            <input
                type="range"
                min="0"
                max="100"
                className="w-full accent-blue-500 mb-3"
            />

            {/* TP SL */}
            <div className="flex justify-between items-center mb-4">
                <span className="text-xs text-gray-400">TP/SL</span>

                <button
                    onClick={() => setTpSlEnabled(!tpSlEnabled)}
                    className={`w-10 h-5 rounded-full ${tpSlEnabled ? "bg-blue-500" : "bg-gray-600"}`}
                />
            </div>

            {/* ACTION */}
            {!isConnected ? (
                <ConnectButton />
            ) : (
                <button
                    onClick={handleTrade}
                    disabled={loading}
                    className="w-full bg-blue-600 py-3 rounded font-semibold"
                >
                    {loading
                        ? "Executing..."
                        : `Place ${activeTab.toUpperCase()} Order`}
                </button>
            )}
        </div>
    );
};

export default TradePanel;