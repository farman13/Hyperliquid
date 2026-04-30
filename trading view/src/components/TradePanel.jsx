import React, { useState, useEffect } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { usePrices } from "../hooks/usePrices";
import { placeTrade } from "../services/tradeService";
import { approveAgent } from "../services/agentService";
import { approveBuilderFee } from "../services/builderService";
import { useBalance } from "../hooks/useBalance";

const TradePanel = () => {
    const { isConnected, address } = useAccount();

    const prices = usePrices();
    const balance = useBalance(address);

    const [activeTab, setActiveTab] = useState("long");
    const [orderType, setOrderType] = useState("market");

    const [leverage, setLeverage] = useState(5);
    const [size, setSize] = useState("");
    const [coin, setCoin] = useState("BTC");

    const [loading, setLoading] = useState(false);
    const [approving, setApproving] = useState(false);
    const [approvingBuilder, setApprovingBuilder] = useState(false);

    const [agentApproved, setAgentApproved] = useState(false);
    const [builderApproved, setBuilderApproved] = useState(false);

    const AGENT_ADDRESS = "0x4A04b217a88BAEEEbc6A726A6411Ce2A74176fC2";

    const BUILDER_ADDRESS = "0xB7c94Ac7C1C16744E9f3cDDEC09F54920D2C39B8";

    // ✅ Change this whenever you change backend builder fee.
    // Backend f: 50 = 0.05%
    const BUILDER_FEE_RATE = "0.1%";

    // ✅ Bump this if you ever want to force re-approval.
    const BUILDER_APPROVAL_VERSION = "v1";

    const builderFeeRateDecimal = 0.001; // 0.1%

    const builderApprovalKey = address
        ? `builderApproved_${address}_${BUILDER_ADDRESS}_${BUILDER_FEE_RATE}_${BUILDER_APPROVAL_VERSION}`
        : null;

    useEffect(() => {
        if (!address) {
            setAgentApproved(false);
            setBuilderApproved(false);
            return;
        }

        const savedAgent = localStorage.getItem(`agentApproved_${address}`);

        const savedBuilder = builderApprovalKey
            ? localStorage.getItem(builderApprovalKey)
            : null;

        setAgentApproved(savedAgent === "true");
        setBuilderApproved(savedBuilder === "true");
    }, [address, builderApprovalKey]);

    const currentPrice = Number(prices?.[coin] || 0);
    const coinSize = Number(size || 0);
    const numericBalance = Number(balance || 0);
    const numericLeverage = Number(leverage || 1);

    const positionValue = coinSize * currentPrice;
    const marginUsed = positionValue / numericLeverage;

    const estimatedLiquidation =
        currentPrice && numericLeverage
            ? activeTab === "long"
                ? currentPrice * (1 - 1 / numericLeverage)
                : currentPrice * (1 + 1 / numericLeverage)
            : 0;

    const estimatedFeeRate = 0.00045;
    const estimatedFee = positionValue * estimatedFeeRate;
    const estimatedBuilderFee = positionValue * builderFeeRateDecimal;

    const canTrade =
        agentApproved &&
        builderApproved &&
        coinSize > 0 &&
        marginUsed > 0 &&
        marginUsed <= numericBalance &&
        !loading;

    const resetBuilderApproval = () => {
        setBuilderApproved(false);

        if (builderApprovalKey) {
            localStorage.removeItem(builderApprovalKey);
        }
    };

    const handleApproveAgent = async () => {
        try {
            if (!address) {
                alert("Connect wallet first");
                return;
            }

            setApproving(true);

            await approveAgent(AGENT_ADDRESS);

            setAgentApproved(true);
            localStorage.setItem(`agentApproved_${address}`, "true");

            alert("✅ Agent Approved");
        } catch (err) {
            console.error(err);
            alert("❌ Approval failed");
        } finally {
            setApproving(false);
        }
    };

    const handleApproveBuilderFee = async () => {
        try {
            if (!address) {
                alert("Connect wallet first");
                return;
            }

            if (!BUILDER_ADDRESS || BUILDER_ADDRESS === "0xYOUR_BUILDER_ADDRESS") {
                alert("Set your real builder address first");
                return;
            }

            setApprovingBuilder(true);

            await approveBuilderFee(BUILDER_ADDRESS, BUILDER_FEE_RATE);

            setBuilderApproved(true);

            if (builderApprovalKey) {
                localStorage.setItem(builderApprovalKey, "true");
            }

            alert(`✅ Builder Fee Approved (${BUILDER_FEE_RATE})`);
        } catch (err) {
            console.error(err);
            alert("❌ Builder fee approval failed");
        } finally {
            setApprovingBuilder(false);
        }
    };

    const handleTrade = async () => {
        try {
            if (!agentApproved) {
                alert("⚠️ Please approve agent first");
                return;
            }

            if (!builderApproved) {
                alert(`⚠️ Please approve builder fee first (${BUILDER_FEE_RATE})`);
                return;
            }

            if (!coinSize || coinSize <= 0) {
                alert(`Enter valid ${coin} size`);
                return;
            }

            if (marginUsed > numericBalance) {
                alert("❌ Insufficient balance");
                return;
            }

            setLoading(true);

            const res = await placeTrade({
                coin,
                isLong: activeTab === "long",
                size: coinSize,
                leverage: numericLeverage,
            });

            if (res?.error) {
                if (
                    res.error.includes("Builder fee has not been approved") ||
                    res.error.includes("builder fee") ||
                    res.error.includes("Builder")
                ) {
                    resetBuilderApproval();
                    alert(`⚠️ Builder fee approval required again for ${BUILDER_FEE_RATE}`);
                    return;
                }

                alert(res.error);
            } else {
                alert("✅ Trade executed");
            }
        } catch (err) {
            console.error(err);
            alert("❌ Trade error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full bg-[#0b1220] text-white p-4 border border-[#1e293b] shadow-xl">
            <div className="text-xs text-gray-400 mb-2">
                {coin} Price: ${prices?.[coin] || "loading..."}
            </div>

            <div className="text-xs text-gray-400 mb-2">
                Available to Trade: ${balance || "0"} USDC
            </div>

            {isConnected && (
                <>
                    <button
                        onClick={handleApproveAgent}
                        disabled={approving || agentApproved}
                        className="w-full bg-yellow-500 text-black py-2 rounded mb-3 font-semibold"
                    >
                        {agentApproved
                            ? "Agent Approved ✅"
                            : approving
                                ? "Approving..."
                                : "Approve Agent"}
                    </button>

                    <button
                        onClick={handleApproveBuilderFee}
                        disabled={approvingBuilder || builderApproved}
                        className="w-full bg-purple-500 text-white py-2 rounded mb-3 font-semibold"
                    >
                        {builderApproved
                            ? `Builder Fee Approved (${BUILDER_FEE_RATE}) ✅`
                            : approvingBuilder
                                ? "Approving Builder..."
                                : `Approve Builder Fee (${BUILDER_FEE_RATE})`}
                    </button>
                </>
            )}

            <div className="flex gap-2 mb-4">
                <select
                    value={leverage}
                    onChange={(e) => setLeverage(Number(e.target.value))}
                    className="bg-[#111827] px-3 py-2 rounded-lg text-sm w-1/3"
                >
                    <option value={2}>2x</option>
                    <option value={5}>5x</option>
                    <option value={10}>10x</option>
                    <option value={20}>20x</option>
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

            <div className="flex bg-[#111827] rounded-xl overflow-hidden mb-4">
                <button
                    onClick={() => setActiveTab("long")}
                    className={`flex-1 py-2 ${activeTab === "long"
                        ? "bg-green-500 text-black"
                        : "text-gray-400"
                        }`}
                >
                    Buy / Long
                </button>

                <button
                    onClick={() => setActiveTab("short")}
                    className={`flex-1 py-2 ${activeTab === "short"
                        ? "bg-red-500 text-black"
                        : "text-gray-400"
                        }`}
                >
                    Sell / Short
                </button>
            </div>

            <div className="flex gap-4 mb-4 text-sm">
                {["market", "limit"].map((type) => (
                    <button
                        key={type}
                        onClick={() => setOrderType(type)}
                        className={`${orderType === type
                            ? "text-blue-400"
                            : "text-gray-500"
                            }`}
                    >
                        {type}
                    </button>
                ))}
            </div>

            <input
                type="number"
                placeholder={`Size (${coin})`}
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full p-2 bg-[#111827] rounded mb-3"
            />

            <div className="bg-[#111827] rounded mb-3 p-3 text-xs text-gray-400 space-y-2">
                <div className="flex justify-between">
                    <span>Entry Price</span>
                    <span className="text-white">
                        ${currentPrice ? currentPrice.toFixed(2) : "-"}
                    </span>
                </div>

                <div className="flex justify-between">
                    <span>Size</span>
                    <span className="text-white">
                        {coinSize ? coinSize : "-"} {coin}
                    </span>
                </div>

                <div className="flex justify-between">
                    <span>Position Value</span>
                    <span className="text-white">
                        ${positionValue ? positionValue.toFixed(2) : "-"}
                    </span>
                </div>

                <div className="flex justify-between">
                    <span>Margin Used</span>
                    <span className="text-white">
                        ${marginUsed ? marginUsed.toFixed(2) : "-"}
                    </span>
                </div>

                <div className="flex justify-between">
                    <span>Leverage</span>
                    <span className="text-white">{numericLeverage}x</span>
                </div>

                <div className="flex justify-between">
                    <span>Est. Liquidation</span>
                    <span className="text-red-400">
                        ${estimatedLiquidation ? estimatedLiquidation.toFixed(2) : "-"}
                    </span>
                </div>

                <div className="flex justify-between">
                    <span>Est. Exchange Fee</span>
                    <span className="text-yellow-400">
                        ${estimatedFee ? estimatedFee.toFixed(4) : "-"}
                    </span>
                </div>

                <div className="flex justify-between">
                    <span>Est. Builder Fee ({BUILDER_FEE_RATE})</span>
                    <span className="text-purple-400">
                        ${estimatedBuilderFee ? estimatedBuilderFee.toFixed(4) : "-"}
                    </span>
                </div>
            </div>

            {!isConnected ? (
                <ConnectButton />
            ) : (
                <button
                    onClick={handleTrade}
                    disabled={!canTrade}
                    className={`w-full py-3 rounded font-semibold ${canTrade ? "bg-blue-600" : "bg-gray-600"
                        }`}
                >
                    {loading
                        ? "Executing..."
                        : `Place ${activeTab === "long" ? "LONG" : "SHORT"} Order`}
                </button>
            )}
        </div>
    );
};

export default TradePanel;