import { type ReactNode, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type {
  Contract,
  ContractExtras,
  ContractLine,
  Order,
  OrderDraft,
  OrderStatus,
  OrderSummary,
  TabKey,
} from "@/types";

const families = ["デキスパート", "INNOSiTE", "クラウド"] as const;
type ContractFamily = (typeof families)[number];

type StatusFilter = "all" | OrderStatus;

type BadgeTone = "muted" | "info" | "warning" | "danger" | "success" | "secondary" | "outline";

interface TenantSummary {
  kentemId: string;
  customerName: string;
  contracts: Array<Contract & { family: ContractFamily }>;
  families: Record<ContractFamily, number>;
  nearest: string;
}

type TabDefinition = {
  key: TabKey;
  label: string;
  badgeTone: BadgeTone;
};

type DiffFlags = {
  plan: boolean;
  qty: boolean;
  unitPrice: boolean;
  period: boolean;
};

type DiffComparison = {
  key: string;
  label: string;
  orderLine: OrderSummary | null;
  contractLine: ContractLine | null;
  differences: DiffFlags;
};

const draftStatusBadge: Record<OrderDraft["status"], BadgeTone> = {
  draft: "muted",
  submitted: "info",
  approved: "success",
  posted: "success",
};

const tabs: TabDefinition[] = [
  { key: "orders", label: "注文(受信)", badgeTone: "info" },
  { key: "processing", label: "処理", badgeTone: "warning" },
  { key: "confirmed", label: "確定", badgeTone: "success" },
  { key: "tenants", label: "顧客(KENTEM ID)", badgeTone: "secondary" },
];

const orderStatesForTab: Record<TabKey, OrderStatus[] | null> = {
  orders: ["received", "triaged", "validating", "needs_fix", "ready_for_approval"],
  processing: ["validating", "needs_fix", "ready_for_approval"],
  confirmed: ["approved", "posted"],
  tenants: null,
};

const statusBadge: Record<OrderStatus, BadgeTone> = {
  received: "muted",
  triaged: "outline",
  validating: "info",
  needs_fix: "warning",
  ready_for_approval: "info",
  approved: "info",
  posted: "success",
};

const seedOrders: Order[] = [
  {
    id: "o1",
    orderNumber: "SO-2025-0919-0001",
    kentemId: "K-000123",
    customerName: "株式会社アーク",
    productSummary: "SiTE-SCOPE / annual × 10",
    shippingDate: "2025-09-22",
    receivedAt: "2025-09-19T09:05:00+09:00",
    errors: 1,
    warns: 0,
    assigned: null,
    status: "received",
    total: 320000,
    lines: [
      {
        product: "SiTE-SCOPE",
        plan: "annual",
        qty: 10,
        unitPrice: 32000,
        startDate: "2025-09-22",
        endDate: "2026-09-21",
      },
    ],
  },
  {
    id: "o8",
    orderNumber: "SO-2025-0919-0009",
    kentemId: "K-000888",
    customerName: "焼津建設",
    productSummary: "SiTE-SCOPE / annual × 2",
    shippingDate: "2025-09-19",
    receivedAt: "2025-09-19T09:30:00+09:00",
    errors: 0,
    warns: 1,
    assigned: null,
    status: "received",
    total: 60000,
    lines: [
      {
        product: "SiTE-SCOPE",
        plan: "annual",
        qty: 2,
        unitPrice: 30000,
        startDate: "2025-09-19",
        endDate: "2026-09-18",
      },
    ],
  },
  {
    id: "o2",
    orderNumber: "SO-2025-0919-0002",
    kentemId: "K-000456",
    customerName: "三島テック株式会社",
    productSummary: "SiTECH 3D / annual × 3",
    shippingDate: "2025-09-20",
    receivedAt: "2025-09-19T09:10:00+09:00",
    errors: 0,
    warns: 2,
    assigned: "山田",
    status: "validating",
    total: 90000,
    lines: [
      {
        product: "SiTECH 3D",
        plan: "annual",
        qty: 3,
        unitPrice: 30000,
        startDate: "2025-09-20",
        endDate: "2026-09-19",
      },
    ],
  },
  {
    id: "o4",
    orderNumber: "SO-2025-0917-0003",
    kentemId: "K-000777",
    customerName: "富士ソリューションズ",
    productSummary: "SiTE-STRUCTURE / annual × 5",
    shippingDate: "2025-09-21",
    receivedAt: "2025-09-17T11:02:00+09:00",
    errors: 0,
    warns: 0,
    assigned: "佐藤",
    status: "ready_for_approval",
    total: 210000,
    lines: [
      {
        product: "SiTE-STRUCTURE",
        plan: "annual",
        qty: 5,
        unitPrice: 42000,
        startDate: "2025-09-21",
        endDate: "2026-09-20",
      },
    ],
  },
  {
    id: "o5",
    orderNumber: "SO-2025-0915-0005",
    kentemId: "K-000999",
    customerName: "沼津ビルド",
    productSummary: "SiTE-SCOPE OP / annual × 10",
    shippingDate: "2025-09-19",
    receivedAt: "2025-09-15T10:00:00+09:00",
    errors: 0,
    warns: 0,
    assigned: "田中",
    status: "approved",
    total: 50000,
    lines: [
      {
        product: "SiTE-SCOPE OP",
        plan: "annual",
        qty: 10,
        unitPrice: 5000,
        startDate: "2025-09-19",
        endDate: "2026-09-18",
      },
    ],
  },
];

const seedContracts: Contract[] = [
  {
    id: "c1",
    contractNumber: "CT-2024-01001",
    kentemId: "K-000123",
    customerName: "株式会社アーク",
    productSummary: "SiTE-SCOPE / annual × 15",
    status: "active",
    effectiveFrom: "2025-04-01",
    effectiveTo: "2026-03-31",
    version: 3,
    total: 450000,
    lines: [
      {
        product: "SiTE-SCOPE",
        plan: "annual",
        qty: 10,
        unitPrice: 30000,
        startDate: "2025-04-01",
        endDate: "2026-03-31",
      },
      {
        product: "SiTE-SCOPE OP-A",
        plan: "annual",
        qty: 5,
        unitPrice: 5000,
        startDate: "2025-04-01",
        endDate: "2026-03-31",
      },
    ],
  },
  {
    id: "c2",
    contractNumber: "CT-2025-02099",
    kentemId: "K-000456",
    customerName: "三島テック株式会社",
    productSummary: "SiTECH 3D / annual × 3",
    status: "active",
    effectiveFrom: "2025-08-01",
    effectiveTo: "2026-07-31",
    version: 1,
    total: 180000,
    lines: [
      {
        product: "SiTECH 3D",
        plan: "annual",
        qty: 3,
        unitPrice: 60000,
        startDate: "2025-08-01",
        endDate: "2026-07-31",
      },
    ],
  },
  {
    id: "c3",
    contractNumber: "CT-2023-09005",
    kentemId: "K-000777",
    customerName: "富士ソリューションズ",
    productSummary: "SiTE-STRUCTURE / annual × 5",
    status: "active",
    effectiveFrom: "2024-10-01",
    effectiveTo: "2025-09-30",
    version: 4,
    total: 210000,
    lines: [
      {
        product: "SiTE-STRUCTURE",
        plan: "annual",
        qty: 5,
        unitPrice: 42000,
        startDate: "2024-10-01",
        endDate: "2025-09-30",
      },
    ],
  },
];

const seedExtras: Record<string, ContractExtras> = {
  c1: {
    billing: {
      billingAddress: "〒420-0000 静岡県静岡市葵区〇〇1-2-3 アーク本社3F 経理部",
      invoiceCycle: "monthly",
      paymentMethod: "bank_transfer",
      paymentTerms: "Net30",
      taxRate: "10%",
      currency: "JPY",
    },
    contacts: {
      billing: { name: "大橋 経理", email: "keiri@example.com", tel: "054-000-0000" },
      admin: { name: "田島 総務", email: "admin@example.com" },
      tech: { name: "柏木 情シス", email: "sys@example.com" },
    },
    addresses: {
      serviceAddress: "静岡県静岡市葵区〇〇1-2-3",
      shippingAddress: "静岡県藤枝市…",
    },
    rules: {
      renewal: { type: "auto", noticePeriodDays: 30 },
      cancellation: { policy: "期間内解約は月割り。違約金: 残期間の30%" },
      discounts: [{ rule: "Autumn2025", value: "10%" }],
      sla: [
        { severity: "P1", responseHrs: 1, restoreHrs: 4 },
        { severity: "P2", responseHrs: 4, restoreHrs: 16 },
      ],
    },
    notes: ["現場ライセンスの追加予定(10月)", "請求書送付はPDF/メール優先"],
    attachments: [
      { name: "契約書_v3.pdf", type: "pdf", size: "214KB" },
      { name: "見積書_2025-03.pdf", type: "pdf", size: "132KB" },
    ],
  },
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}/${month}/${day}`;
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}/${month}/${day} ${hours}:${minutes}`;
}

function daysLeft(to: string) {
  const now = new Date();
  const end = new Date(`${to}T00:00:00+09:00`);
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

function timeHHMM(iso: string) {
  const date = new Date(iso);
  return `${`${date.getHours()}`.padStart(2, "0")}:${`${date.getMinutes()}`.padStart(2, "0")}`;
}

function familyOfContract(contract: Contract): ContractFamily {
  const names = contract.lines.map((line) => line.product).join(" ").toLowerCase();
  if (names.includes("デキス") || names.includes("dekis")) return "デキスパート";
  if (names.includes("site") || names.includes("innosite")) return "INNOSiTE";
  return "クラウド";
}

function formatCurrency(value: number) {
  return `¥${value.toLocaleString("ja-JP")}`;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold tracking-wide text-muted-foreground">{title}</div>
      <div className="rounded-xl border bg-card p-4 shadow-sm">{children}</div>
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="text-sm text-foreground">{value}</div>
    </div>
  );
}

function DiffValue({ label, value, changed }: { label: string; value: ReactNode; changed: boolean }) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          "rounded-lg border px-3 py-2 text-sm",
          changed ? "border-amber-300 bg-amber-50 text-amber-900" : "border-border bg-muted/60 text-foreground"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function DiffColumn({
  title,
  line,
  differences,
}: {
  title: string;
  line: OrderSummary | ContractLine | null;
  differences: DiffFlags;
}) {
  const period = line ? `${formatDate(line.startDate)} → ${formatDate(line.endDate)}` : "—";

  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="mt-3 space-y-3">
        <DiffValue label="プラン" value={line?.plan ?? "—"} changed={differences.plan} />
        <DiffValue label="数量" value={line ? `${line.qty}` : "—"} changed={differences.qty} />
        <DiffValue label="単価" value={line ? formatCurrency(line.unitPrice) : "—"} changed={differences.unitPrice} />
        <DiffValue label="期間" value={period} changed={differences.period} />
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("tenants");
  const [orders, setOrders] = useState<Order[]>(seedOrders);
  const [contracts, setContracts] = useState<Contract[]>(seedContracts);
  const [search, setSearch] = useState("");
  const [kidFilter, setKidFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(seedOrders[0]?.id ?? null);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(seedContracts[0]?.id ?? null);
  const [selectedTenantKid, setSelectedTenantKid] = useState<string | null>(null);
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [diffModalOpen, setDiffModalOpen] = useState(false);
  const [diffContractId, setDiffContractId] = useState<string | null>(null);
  const [orderDrafts, setOrderDrafts] = useState<Record<string, OrderDraft>>({});
  const [draftSelection, setDraftSelection] = useState<Record<string, boolean>>({});

  const isTenantView = activeTab === "tenants";
  const currentOrderStates = orderStatesForTab[activeTab];

  const filteredOrders = useMemo(() => {
    if (!currentOrderStates) return [] as Order[];
    const keyword = search.toLowerCase();
    const kidKey = kidFilter.toLowerCase();

    return orders
      .filter((order) => currentOrderStates.includes(order.status))
      .filter((order) => {
        if (!keyword) return true;
        return (
          order.orderNumber.toLowerCase().includes(keyword) ||
          order.customerName.toLowerCase().includes(keyword)
        );
      })
      .filter((order) => {
        if (!kidKey) return true;
        return order.kentemId.toLowerCase().includes(kidKey);
      })
      .filter((order) => (statusFilter === "all" ? true : order.status === statusFilter))
      .sort((a, b) => {
        const aNull = a.shippingDate === null ? 1 : 0;
        const bNull = b.shippingDate === null ? 1 : 0;
        if (aNull !== bNull) return aNull - bNull;
        if (a.shippingDate && b.shippingDate && a.shippingDate !== b.shippingDate) {
          return a.shippingDate < b.shippingDate ? -1 : 1;
        }
        if (a.receivedAt < b.receivedAt) return -1;
        if (a.receivedAt > b.receivedAt) return 1;
        return 0;
      });
  }, [currentOrderStates, kidFilter, orders, search, statusFilter]);

  const selectedOrder = useMemo(
    () => (selectedOrderId ? orders.find((order) => order.id === selectedOrderId) ?? null : null),
    [orders, selectedOrderId]
  );

  const tenants = useMemo<TenantSummary[]>(() => {
    const keyword = search.toLowerCase();
    const kidKey = kidFilter.toLowerCase();
    const map = new Map<string, TenantSummary>();

    for (const contract of contracts) {
      if (!map.has(contract.kentemId)) {
        map.set(contract.kentemId, {
          kentemId: contract.kentemId,
          customerName: contract.customerName,
          contracts: [],
          families: {
            デキスパート: 0,
            INNOSiTE: 0,
            クラウド: 0,
          },
          nearest: contract.effectiveTo,
        });
      }
      const entry = map.get(contract.kentemId)!;
      const family = familyOfContract(contract);
      entry.contracts.push({ ...contract, family });
      entry.families[family] += 1;
      if (contract.effectiveTo < entry.nearest) {
        entry.nearest = contract.effectiveTo;
      }
    }

    let list = Array.from(map.values());
    if (keyword) {
      list = list.filter(
        (tenant) =>
          tenant.customerName.toLowerCase().includes(keyword) ||
          tenant.kentemId.toLowerCase().includes(keyword)
      );
    }
    if (kidKey) {
      list = list.filter((tenant) => tenant.kentemId.toLowerCase().includes(kidKey));
    }
    list.sort((a, b) => (a.nearest < b.nearest ? -1 : a.nearest > b.nearest ? 1 : 0));
    return list;
  }, [contracts, kidFilter, search]);

  const selectedTenant = useMemo(() => {
    const targetKid = selectedTenantKid ?? tenants[0]?.kentemId ?? null;
    return tenants.find((tenant) => tenant.kentemId === targetKid) ?? null;
  }, [selectedTenantKid, tenants]);

  const counts = useMemo<Record<TabKey, number>>(
    () => ({
      orders: orders.filter((order) => orderStatesForTab.orders!.includes(order.status)).length,
      processing: orders.filter((order) => orderStatesForTab.processing!.includes(order.status)).length,
      confirmed: orders.filter((order) => orderStatesForTab.confirmed!.includes(order.status)).length,
      tenants: new Set(contracts.map((contract) => contract.kentemId)).size,
    }),
    [contracts, orders]
  );

  function toggleDraftSelection(lineKey: string) {
    setDraftSelection((prev) => ({ ...prev, [lineKey]: !prev[lineKey] }));
  }

  function saveDraftFromSelection() {
    if (!selectedOrder) return;
    const selectedKeys = Object.entries(draftSelection)
      .filter(([, value]) => value)
      .map(([key]) => key);
    if (selectedKeys.length === 0) return;

    const lines = selectedOrder.lines
      .filter((line) => selectedKeys.includes(`${line.product}::${line.plan}`))
      .map((line) => ({ ...line }));

    const now = new Date().toISOString();
    setOrderDrafts((prev) => {
      const existing = prev[selectedOrder.id];
      const createdAt = existing?.createdAt ?? now;
      const createdBy = existing?.createdBy ?? (selectedOrder.assigned ?? "担当者");

      return {
        ...prev,
        [selectedOrder.id]: {
          id: existing?.id ?? `draft-${selectedOrder.id}`,
          orderId: selectedOrder.id,
          contractId: diffTargetContract?.id ?? null,
          lines,
          status: "draft",
          createdAt,
          updatedAt: now,
          createdBy,
        },
      };
    });

    setDiffModalOpen(false);
  }

  function submitDraftForApproval(orderId: string) {
    const draft = orderDrafts[orderId];
    if (!draft || draft.lines.length === 0) return;
    const now = new Date().toISOString();
    setOrderDrafts((prev) => ({
      ...prev,
      [orderId]: {
        ...draft,
        status: "submitted",
        submittedAt: now,
        approvedAt: undefined,
        postedAt: undefined,
        updatedAt: now,
      },
    }));
    setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, status: "ready_for_approval" } : order)));
  }

  function approveDraft(orderId: string) {
    const draft = orderDrafts[orderId];
    const now = new Date().toISOString();
    if (!draft) return;
    setOrderDrafts((prev) => ({
      ...prev,
      [orderId]: {
        ...draft,
        status: "approved",
        approvedAt: now,
        updatedAt: now,
      },
    }));
    setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, status: "approved" } : order)));
  }

  function postDraft(orderId: string) {
    const draft = orderDrafts[orderId];
    const now = new Date().toISOString();
    if (!draft) return;
    setOrderDrafts((prev) => ({
      ...prev,
      [orderId]: {
        ...draft,
        status: "posted",
        postedAt: now,
        updatedAt: now,
      },
    }));
    setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, status: "posted" } : order)));
  }

  function sendBackDraft(orderId: string) {
    const draft = orderDrafts[orderId];
    const now = new Date().toISOString();
    if (draft) {
      setOrderDrafts((prev) => ({
        ...prev,
        [orderId]: {
          ...draft,
          status: "draft",
          submittedAt: undefined,
          approvedAt: undefined,
          postedAt: undefined,
          updatedAt: now,
        },
      }));
    }
    setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, status: "needs_fix" } : order)));
  }

  function assignTo(orderId: string, assignee: string) {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId
          ? {
              ...order,
              assigned: assignee,
              status: order.status === "received" ? "triaged" : order.status,
            }
          : order
      )
    );
  }

  function updateOrderStatus(orderId: string, status: OrderStatus) {
    setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, status } : order)));
  }

  const contractsForSelectedOrder = useMemo(() => {
    if (!selectedOrder) return [] as Contract[];
    return contracts.filter((contract) => contract.kentemId === selectedOrder.kentemId);
  }, [contracts, selectedOrder]);

  const selectedContract = useMemo(
    () => (selectedContractId ? contracts.find((contract) => contract.id === selectedContractId) ?? null : null),
    [contracts, selectedContractId]
  );

  const extras = selectedContract ? seedExtras[selectedContract.id] : undefined;

  useEffect(() => {
    if (!selectedOrder || contractsForSelectedOrder.length === 0) {
      setDiffContractId(null);
      return;
    }
    if (!diffContractId || !contractsForSelectedOrder.some((contract) => contract.id === diffContractId)) {
      setDiffContractId(contractsForSelectedOrder[0].id);
    }
  }, [contractsForSelectedOrder, diffContractId, selectedOrder]);

  const diffTargetContract = useMemo(
    () =>
      contractsForSelectedOrder.length === 0
        ? null
        : contractsForSelectedOrder.find((contract) => contract.id === diffContractId) ?? contractsForSelectedOrder[0] ?? null,
    [contractsForSelectedOrder, diffContractId]
  );

  const draftForSelectedOrder = useMemo(
    () => (selectedOrder ? orderDrafts[selectedOrder.id] ?? null : null),
    [orderDrafts, selectedOrder]
  );

  const draftContract = useMemo(
    () =>
      draftForSelectedOrder?.contractId
        ? contracts.find((contract) => contract.id === draftForSelectedOrder.contractId) ?? null
        : null,
    [contracts, draftForSelectedOrder]
  );

  const canSubmitDraft = !!draftForSelectedOrder && draftForSelectedOrder.status === "draft" && draftForSelectedOrder.lines.length > 0;
  const canApproveDraft =
    !!selectedOrder && selectedOrder.status === "ready_for_approval" && draftForSelectedOrder?.status === "submitted";
  const canPostDraft =
    !!selectedOrder && selectedOrder.status === "approved" && draftForSelectedOrder?.status === "approved";
  const canSendBackDraft =
    !!selectedOrder && (!!draftForSelectedOrder && ["ready_for_approval", "approved"].includes(selectedOrder.status));

  const diffComparisons = useMemo(() => {
    if (!diffModalOpen || !selectedOrder || !diffTargetContract) return [] as DiffComparison[];

    const orderLines = selectedOrder.lines;
    const contractLines = diffTargetContract.lines;

    const orderMap = new Map<string, OrderSummary>();
    const contractMap = new Map<string, ContractLine>();

    for (const line of orderLines) {
      orderMap.set(`${line.product}::${line.plan}`, line);
    }
    for (const line of contractLines) {
      contractMap.set(`${line.product}::${line.plan}`, line);
    }

    const keys = new Set([...orderMap.keys(), ...contractMap.keys()]);

    const comparisons: DiffComparison[] = [];
    for (const key of Array.from(keys)) {
      const orderLine = orderMap.get(key) ?? null;
      const contractLine = contractMap.get(key) ?? null;
      const productLabel = orderLine?.product ?? contractLine?.product ?? "不明な製品";
      const planLabel = orderLine?.plan ?? contractLine?.plan ?? "—";

      const planChanged = (orderLine?.plan ?? "—") !== (contractLine?.plan ?? "—");
      const qtyChanged = (orderLine?.qty ?? 0) !== (contractLine?.qty ?? 0);
      const unitPriceChanged = (orderLine?.unitPrice ?? 0) !== (contractLine?.unitPrice ?? 0);
      const periodChanged =
        (orderLine?.startDate ?? "") !== (contractLine?.startDate ?? "") ||
        (orderLine?.endDate ?? "") !== (contractLine?.endDate ?? "");

      comparisons.push({
        key,
        label: `${productLabel} / ${planLabel}`,
        orderLine,
        contractLine,
        differences: {
          plan: planChanged,
          qty: qtyChanged,
          unitPrice: unitPriceChanged,
          period: periodChanged,
        },
      });
    }

    return comparisons.sort((a, b) => a.label.localeCompare(b.label, "ja"));
  }, [diffModalOpen, diffTargetContract, selectedOrder]);

  const draftSelectionCount = useMemo(
    () => Object.values(draftSelection).filter(Boolean).length,
    [draftSelection]
  );

  useEffect(() => {
    if (!diffModalOpen || !selectedOrder) return;
    const existingDraft = orderDrafts[selectedOrder.id];
    const nextSelection: Record<string, boolean> = {};

    if (existingDraft && existingDraft.lines.length > 0) {
      for (const line of existingDraft.lines) {
        nextSelection[`${line.product}::${line.plan}`] = true;
      }
    } else {
      for (const item of diffComparisons) {
        if (item.orderLine && Object.values(item.differences).some(Boolean)) {
          nextSelection[item.key] = true;
        }
      }
    }

    const keys = new Set([...Object.keys(nextSelection), ...Object.keys(draftSelection)]);
    const isSame = Array.from(keys).every((key) => {
      const a = nextSelection[key] ?? false;
      const b = draftSelection[key] ?? false;
      return a === b;
    });

    if (!isSame) {
      setDraftSelection(nextSelection);
    }
  }, [diffComparisons, diffModalOpen, draftSelection, orderDrafts, selectedOrder]);

  return (
    <div className="min-h-screen bg-muted/30 py-6">
      <div className="mx-auto flex h-[calc(100vh-48px)] max-w-[1400px] flex-col gap-4 px-4">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as TabKey)}
          className="w-full"
        >
          <div className="flex flex-wrap items-center gap-3">
            <TabsList className="flex flex-wrap gap-2 bg-muted p-1">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.key} value={tab.key} className="gap-2">
                  <span>{tab.label}</span>
                  <Badge variant={tab.badgeTone} className="hidden min-w-[2.5rem] justify-center md:inline-flex">
                    {counts[tab.key]}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={isTenantView ? "KENTEM ID / 顧客名で検索" : "受注番号 / 顧客名で検索"}
                className="w-full min-w-[200px] md:w-56"
              />
              <Input
                value={kidFilter}
                onChange={(event) => setKidFilter(event.target.value)}
                placeholder="KENTEM ID"
                className="w-full min-w-[160px] md:w-40"
              />
              {!isTenantView && (
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                  <SelectTrigger className="w-full min-w-[180px] md:w-44">
                    <SelectValue placeholder="状態: すべて" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">状態: すべて</SelectItem>
                    <SelectItem value="received">received</SelectItem>
                    <SelectItem value="triaged">triaged</SelectItem>
                    <SelectItem value="validating">validating</SelectItem>
                    <SelectItem value="needs_fix">needs_fix</SelectItem>
                    <SelectItem value="ready_for_approval">ready_for_approval</SelectItem>
                    <SelectItem value="approved">approved</SelectItem>
                    <SelectItem value="posted">posted</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </Tabs>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[58%_42%]">
          <section className="flex min-h-0 flex-col gap-4">
            <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <CardHeader className="flex flex-col gap-1 border-b bg-card px-6 py-4">
                <CardTitle className="text-base">
                  {isTenantView
                    ? "顧客(KENTEM ID) — 期限が近い順"
                    : `${tabs.find((tab) => tab.key === activeTab)?.label ?? ""} — 出荷日↑ / 同日:受信時刻↑`}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {isTenantView ? tenants.length : filteredOrders.length} 件
                </p>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                {isTenantView ? (
                  <ScrollArea className="h-full">
                    <div className="hidden grid-cols-12 px-6 py-2 text-xs font-medium text-muted-foreground md:grid">
                      <div className="col-span-3">KENTEM ID / 顧客</div>
                      <div className="col-span-3">ファミリ内訳</div>
                      <div className="col-span-2">契約数</div>
                      <div className="col-span-2">最短満了</div>
                      <div className="col-span-2 text-right pr-3">開く</div>
                    </div>
                    <div className="divide-y">
                      {tenants.map((tenant) => {
                        const isActive = selectedTenant?.kentemId === tenant.kentemId;
                        return (
                          <button
                            key={tenant.kentemId}
                            type="button"
                            onClick={() => setSelectedTenantKid(tenant.kentemId)}
                            className={cn(
                              "w-full text-left text-sm transition",
                              "grid grid-cols-1 gap-4 px-6 py-4 md:grid-cols-12 md:items-center",
                              isActive ? "bg-muted" : "hover:bg-muted/60"
                            )}
                          >
                            <div className="space-y-1 md:col-span-3">
                              <div className="font-medium text-foreground">{tenant.kentemId}</div>
                              <div className="text-xs text-muted-foreground">{tenant.customerName}</div>
                            </div>
                            <div className="space-y-1 md:col-span-3">
                              <div className="text-xs font-medium text-muted-foreground md:hidden">ファミリ内訳</div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="muted">デキ: {tenant.families["デキスパート"]}</Badge>
                                <Badge variant="info">INNO: {tenant.families["INNOSiTE"]}</Badge>
                                <Badge variant="success">クラウド: {tenant.families["クラウド"]}</Badge>
                              </div>
                            </div>
                            <div className="space-y-1 md:col-span-2">
                              <div className="text-xs font-medium text-muted-foreground md:hidden">契約数</div>
                              <div>{tenant.contracts.length}</div>
                            </div>
                            <div className="space-y-1 md:col-span-2">
                              <div className="text-xs font-medium text-muted-foreground md:hidden">最短満了</div>
                              <div>
                                {formatDate(tenant.nearest)}（残{daysLeft(tenant.nearest)}日）
                              </div>
                            </div>
                            <div className="flex justify-end space-y-0 md:col-span-2 md:pr-3">
                              <div className="w-full md:w-auto">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setSelectedTenantKid(tenant.kentemId);
                                  }}
                                  className="w-full md:w-auto"
                                >
                                  詳細
                                </Button>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                      {tenants.length === 0 && (
                        <div className="px-6 py-12 text-center text-sm text-muted-foreground">条件に一致する顧客が見つかりません。</div>
                      )}
                    </div>
                  </ScrollArea>
                ) : (
                  <ScrollArea className="h-full">
                    <div className="hidden grid-cols-12 px-6 py-2 text-xs font-medium text-muted-foreground md:grid">
                      <div className="col-span-3">受注番号 / 顧客</div>
                      <div className="col-span-2">KENTEM ID</div>
                      <div className="col-span-3">主要製品</div>
                      <div className="col-span-2">出荷日 / 受信</div>
                      <div className="col-span-2 text-right pr-3">状態 / エラー</div>
                    </div>
                    <div className="divide-y">
                      {filteredOrders.map((order) => {
                        const isActive = selectedOrder?.id === order.id;
                        return (
                          <button
                            key={order.id}
                            type="button"
                            onClick={() => setSelectedOrderId(order.id)}
                            className={cn(
                              "w-full text-left text-sm transition",
                              "grid grid-cols-1 gap-4 px-6 py-4 md:grid-cols-12 md:items-center",
                              isActive ? "bg-muted" : "hover:bg-muted/60"
                            )}
                          >
                            <div className="space-y-1 md:col-span-3">
                              <div className="font-medium text-foreground">{order.orderNumber}</div>
                              <div className="text-xs text-muted-foreground">{order.customerName}</div>
                            </div>
                            <div className="space-y-1 md:col-span-2">
                              <div className="text-xs font-medium text-muted-foreground md:hidden">KENTEM ID</div>
                              <div className="flex items-center gap-2">
                                <Badge variant="muted">{order.kentemId}</Badge>
                              </div>
                            </div>
                            <div className="space-y-1 text-muted-foreground md:col-span-3">
                              <div className="text-xs font-medium text-muted-foreground md:hidden text-foreground/80">主要製品</div>
                              <div>{order.productSummary}</div>
                            </div>
                            <div className="space-y-1 text-muted-foreground md:col-span-2">
                              <div className="text-xs font-medium text-muted-foreground md:hidden text-foreground/80">出荷日 / 受信</div>
                              <div>出荷: {formatDate(order.shippingDate)}</div>
                              <div className="text-xs text-muted-foreground">受信: {timeHHMM(order.receivedAt)}</div>
                            </div>
                            <div className="space-y-1 md:col-span-2 md:pr-3">
                              <div className="text-xs font-medium text-muted-foreground md:hidden text-foreground/80">状態 / エラー</div>
                              <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
                                <Badge variant={statusBadge[order.status]}>{order.status}</Badge>
                                {(order.errors > 0 || order.warns > 0) && (
                                  <div className="flex items-center gap-1">
                                    {order.errors > 0 && <Badge variant="danger">E{order.errors}</Badge>}
                                    {order.warns > 0 && <Badge variant="warning">W{order.warns}</Badge>}
                                  </div>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                      {filteredOrders.length === 0 && (
                        <div className="px-6 py-12 text-center text-sm text-muted-foreground">条件に一致する注文が見つかりません。</div>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="flex min-h-0 flex-col overflow-hidden">
            {isTenantView ? (
              selectedTenant ? (
                <ScrollArea className="h-full pr-2">
                  <div className="flex flex-col gap-4 pb-4">
                    <Card>
                      <CardHeader className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs text-muted-foreground">KENTEM ID</div>
                          <CardTitle className="text-lg">{selectedTenant.kentemId}</CardTitle>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="info">{selectedTenant.customerName}</Badge>
                          <Badge variant="muted">契約 {selectedTenant.contracts.length}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4 md:grid-cols-3">
                          {families.map((family) => {
                            const familyContracts = selectedTenant.contracts.filter((contract) => contract.family === family);
                            return (
                              <Section key={family} title={family}>
                                {familyContracts.length === 0 ? (
                                  <div className="text-sm text-muted-foreground">契約なし</div>
                                ) : (
                                  <ul className="space-y-2 text-sm">
                                    {familyContracts.map((contract) => (
                                      <li key={contract.id} className="flex items-start justify-between gap-3">
                                        <div>
                                          <div className="font-medium text-foreground">
                                            {contract.contractNumber} <span className="text-xs text-muted-foreground">v{contract.version}</span>
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            {formatDate(contract.effectiveFrom)} → {formatDate(contract.effectiveTo)} / {contract.productSummary}
                                          </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                          <Badge variant="success">{contract.status}</Badge>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              setSelectedContractId(contract.id);
                                              setContractModalOpen(true);
                                            }}
                                          >
                                            詳細
                                          </Button>
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </Section>
                            );
                          })}
                        </div>
                      </CardContent>
                  </Card>

                </div>
              </ScrollArea>
            ) : (
                <Card className="flex-1">
                  <CardContent className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    左の一覧からKENTEM IDを選択してください。
                  </CardContent>
                </Card>
              )
            ) : selectedOrder ? (
              <ScrollArea className="h-full pr-2">
                <div className="flex flex-col gap-4 pb-4">
                  <Card>
                    <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-xs text-muted-foreground">受注番号</div>
                        <CardTitle className="text-lg">{selectedOrder.orderNumber}</CardTitle>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="muted">{selectedOrder.kentemId}</Badge>
                        <Badge variant="info">{selectedOrder.customerName}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <KeyValue label="主要製品" value={selectedOrder.productSummary} />
                        <KeyValue label="出荷日" value={formatDate(selectedOrder.shippingDate)} />
                        <KeyValue label="受信" value={new Date(selectedOrder.receivedAt).toLocaleString()} />
                        <KeyValue label="担当" value={selectedOrder.assigned ?? "—"} />
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={statusBadge[selectedOrder.status]}>{selectedOrder.status}</Badge>
                        <Badge variant="danger">E{selectedOrder.errors}</Badge>
                        <Badge variant="warning">W{selectedOrder.warns}</Badge>
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        <Button variant="outline" onClick={() => assignTo(selectedOrder.id, "あなた")}>担当に割当</Button>
                        <Button variant="subtle" onClick={() => updateOrderStatus(selectedOrder.id, "validating")}>
                          検証を実行
                        </Button>
                        <Button
                          variant="default"
                          onClick={() => submitDraftForApproval(selectedOrder.id)}
                          disabled={!canSubmitDraft}
                        >
                          ドラフト作成→申請
                        </Button>
                        <Button
                          variant="default"
                          onClick={() => approveDraft(selectedOrder.id)}
                          disabled={!canApproveDraft}
                        >
                          承認
                        </Button>
                        <Button
                          variant="default"
                          onClick={() => postDraft(selectedOrder.id)}
                          disabled={!canPostDraft}
                        >
                          本登録(:post)
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => sendBackDraft(selectedOrder.id)}
                          disabled={!canSendBackDraft}
                        >
                          差戻し
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">チェック結果</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2 text-sm">
                          {selectedOrder.errors > 0 ? (
                            <li className="flex items-start gap-2">
                              <Badge variant="danger">ERROR</Badge>
                              <span>単価とプランの整合が不正です（価格ルール: SCOPE-OP-A）。</span>
                            </li>
                          ) : (
                            <li className="text-muted-foreground">エラーはありません。</li>
                          )}
                          {selectedOrder.warns > 0 ? (
                            <li className="flex items-start gap-2">
                              <Badge variant="warning">WARN</Badge>
                              <span>出荷日が未設定/過去日です。確認してください。</span>
                            </li>
                          ) : (
                            <li className="text-muted-foreground">警告はありません。</li>
                          )}
                        </ul>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">現行契約（同KENTEM ID）</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {contractsForSelectedOrder.length === 0 ? (
                          <div className="text-sm text-muted-foreground">該当する現行契約はありません。</div>
                        ) : (
                          <ul className="space-y-3 text-sm">
                            {contractsForSelectedOrder.map((contract) => (
                              <li key={contract.id} className="flex flex-col gap-2 rounded-lg border border-border p-3">
                                <div>
                                  <div className="font-medium">
                                    {contract.contractNumber} <span className="text-xs text-muted-foreground">v{contract.version}</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatDate(contract.effectiveFrom)} → {formatDate(contract.effectiveTo)} / {contract.productSummary}
                                  </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="success">{contract.status}</Badge>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setActiveTab("tenants");
                                      setSelectedTenantKid(contract.kentemId);
                                    }}
                                  >
                                    KENTEM IDビュー
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedContractId(contract.id);
                                      setContractModalOpen(true);
                                    }}
                                  >
                                    契約詳細
                                  </Button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <CardTitle className="text-base">差分プレビュー</CardTitle>
                      {diffTargetContract && (
                        <div className="text-xs text-muted-foreground md:text-right">
                          比較対象契約: {diffTargetContract.contractNumber} v{diffTargetContract.version}
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {contractsForSelectedOrder.length === 0 ? (
                        <div className="text-sm text-muted-foreground">比較できる現行契約がありません。</div>
                      ) : selectedOrder.lines.length === 0 ? (
                        <div className="text-sm text-muted-foreground">注文に比較対象となる明細がありません。</div>
                      ) : (
                        <>
                          {contractsForSelectedOrder.length > 1 && (
                            <div className="space-y-1">
                              <div className="text-xs text-muted-foreground">比較対象の契約</div>
                              <Select
                                value={diffTargetContract?.id ?? undefined}
                                onValueChange={(value) => setDiffContractId(value)}
                              >
                                <SelectTrigger className="w-full md:w-72">
                                  <SelectValue placeholder="契約を選択" />
                                </SelectTrigger>
                                <SelectContent>
                                  {contractsForSelectedOrder.map((contract) => (
                                    <SelectItem key={contract.id} value={contract.id}>
                                      {contract.contractNumber} v{contract.version}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
                            <Button
                              onClick={() => {
                                if (!diffTargetContract && contractsForSelectedOrder[0]) {
                                  setDiffContractId(contractsForSelectedOrder[0].id);
                                }
                                setDiffModalOpen(true);
                              }}
                              disabled={!diffTargetContract}
                            >
                              差分プレビュー
                            </Button>
                            <div className="text-xs text-muted-foreground">
                              モーダル内でプラン・数量・単価・期間を左右に並べて比較します。
                            </div>
                          </div>
                          <div className="text-[11px] text-muted-foreground">※ ボタン押下時に差分を取得します。</div>
                          {draftForSelectedOrder && (
                            <div className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
                              <div className="flex items-center justify-between gap-2">
                                <span>保存済みドラフト</span>
                                <Badge variant={draftStatusBadge[draftForSelectedOrder.status]}>{draftForSelectedOrder.status}</Badge>
                              </div>
                              <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
                                <span>明細 {draftForSelectedOrder.lines.length} 件</span>
                                <span>更新 {formatDateTime(draftForSelectedOrder.updatedAt)}</span>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {draftForSelectedOrder && (
                    <Card>
                      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <CardTitle className="text-base">本登録予定ドラフト</CardTitle>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant={draftStatusBadge[draftForSelectedOrder.status]}>{draftForSelectedOrder.status}</Badge>
                          <span>更新 {formatDateTime(draftForSelectedOrder.updatedAt)}</span>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4 text-sm">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <div className="text-xs text-muted-foreground">比較対象契約</div>
                            <div className="font-medium text-foreground">
                              {draftContract
                                ? `${draftContract.contractNumber} v${draftContract.version}`
                                : draftForSelectedOrder.contractId ?? "未選択"}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">作成者</div>
                            <div className="font-medium text-foreground">{draftForSelectedOrder.createdBy}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">作成</div>
                            <div>{formatDateTime(draftForSelectedOrder.createdAt)}</div>
                          </div>
                          {draftForSelectedOrder.submittedAt && (
                            <div>
                              <div className="text-xs text-muted-foreground">申請</div>
                              <div>{formatDateTime(draftForSelectedOrder.submittedAt)}</div>
                            </div>
                          )}
                          {draftForSelectedOrder.approvedAt && (
                            <div>
                              <div className="text-xs text-muted-foreground">承認</div>
                              <div>{formatDateTime(draftForSelectedOrder.approvedAt)}</div>
                            </div>
                          )}
                          {draftForSelectedOrder.postedAt && (
                            <div>
                              <div className="text-xs text-muted-foreground">本登録</div>
                              <div>{formatDateTime(draftForSelectedOrder.postedAt)}</div>
                            </div>
                          )}
                        </div>

                        <div className="overflow-hidden rounded-xl border">
                          <div className="grid grid-cols-12 bg-muted/60 px-4 py-2 text-xs font-semibold text-muted-foreground">
                            <div className="col-span-4">製品 / プラン</div>
                            <div className="col-span-2">数量</div>
                            <div className="col-span-2">単価</div>
                            <div className="col-span-4">期間</div>
                          </div>
                          <div className="divide-y">
                            {draftForSelectedOrder.lines.map((line) => (
                              <div key={`${line.product}-${line.plan}`} className="grid grid-cols-12 px-4 py-2">
                                <div className="col-span-4">{line.product} / {line.plan}</div>
                                <div className="col-span-2">{line.qty}</div>
                                <div className="col-span-2">{formatCurrency(line.unitPrice)}</div>
                                <div className="col-span-4">{formatDate(line.startDate)} → {formatDate(line.endDate)}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="text-[11px] text-muted-foreground">
                          差分プレビューで編集→再保存するとドラフトは再度「draft」状態に戻ります。
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            ) : (
              <Card className="flex-1">
                <CardContent className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  左の一覧から注文を選択してください。
                </CardContent>
              </Card>
            )}
          </section>
        </div>
      </div>

      <Dialog open={diffModalOpen && !!selectedOrder && !!diffTargetContract} onOpenChange={setDiffModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          {selectedOrder && diffTargetContract ? (
            <ScrollArea className="max-h-[70vh] pr-2">
              <DialogHeader>
                <DialogTitle>差分プレビュー</DialogTitle>
                <DialogDescription>
                  {selectedOrder.orderNumber} ↔︎ {diffTargetContract.contractNumber}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pb-4">
                {diffComparisons.length > 0 ? (
                  <>
                    {diffComparisons.map((item) => {
                      const isSelectable = !!item.orderLine;
                      const isSelected = !!draftSelection[item.key];
                      const hasAnyDiff = Object.values(item.differences).some(Boolean);
                      return (
                        <div
                          key={item.key}
                          className={cn(
                            "space-y-3 rounded-xl border bg-card p-4 shadow-sm",
                            isSelected ? "border-sky-300 ring-1 ring-sky-200" : "border-border",
                            !isSelectable && "opacity-75"
                          )}
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-semibold text-foreground">{item.label}</div>
                              {hasAnyDiff && <Badge variant="info">差分あり</Badge>}
                            </div>
                            {isSelectable ? (
                              <Button
                                size="sm"
                                variant={isSelected ? "default" : "outline"}
                                onClick={() => toggleDraftSelection(item.key)}
                              >
                                {isSelected ? "本登録対象" : "対象に含める"}
                              </Button>
                            ) : (
                              <Badge variant="muted">契約のみ</Badge>
                            )}
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            <DiffColumn title="注文" line={item.orderLine} differences={item.differences} />
                            <DiffColumn title="現行契約" line={item.contractLine} differences={item.differences} />
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex flex-col gap-3 pt-2 md:flex-row md:items-center md:justify-between">
                      <div className="text-xs text-muted-foreground">
                        本登録対象に選択中: {draftSelectionCount} 件
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setDraftSelection({})} disabled={draftSelectionCount === 0}>
                          全て解除
                        </Button>
                        <Button onClick={saveDraftFromSelection} disabled={draftSelectionCount === 0}>
                          ドラフトとして保存
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                    比較できる明細がありません。
                  </div>
                )}
              </div>
            </ScrollArea>
          ) : (
            <div className="py-6 text-sm text-muted-foreground">比較対象がありません。</div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={contractModalOpen && !!selectedContract} onOpenChange={setContractModalOpen}>
        <DialogContent className="max-h-[80vh] overflow-hidden">
          {selectedContract && (
            <ScrollArea className="h-full max-h-[70vh] pr-2">
              <DialogHeader>
                <DialogTitle>契約詳細</DialogTitle>
                <DialogDescription>
                  {selectedContract.contractNumber} / {selectedContract.customerName}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pb-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <KeyValue label="契約番号" value={selectedContract.contractNumber} />
                  <KeyValue label="KENTEM ID" value={selectedContract.kentemId} />
                  <KeyValue label="顧客" value={selectedContract.customerName} />
                  <KeyValue label="状態" value={selectedContract.status} />
                  <KeyValue
                    label="有効期間"
                    value={`${formatDate(selectedContract.effectiveFrom)} - ${formatDate(selectedContract.effectiveTo)}（残${daysLeft(selectedContract.effectiveTo)}日）`}
                  />
                  <KeyValue label="バージョン" value={`v${selectedContract.version}`} />
                  <KeyValue label="合計" value={formatCurrency(selectedContract.total)} />
                </div>

                <Section title="明細">
                  <div className="overflow-hidden rounded-xl border">
                    <div className="grid grid-cols-12 bg-muted/60 px-4 py-2 text-xs font-semibold text-muted-foreground">
                      <div className="col-span-4">製品 / プラン</div>
                      <div className="col-span-2">数量</div>
                      <div className="col-span-2">単価</div>
                      <div className="col-span-4">期間</div>
                    </div>
                    <div className="divide-y">
                      {selectedContract.lines.map((line, index) => (
                        <div key={`${line.product}-${index}`} className="grid grid-cols-12 px-4 py-2 text-sm">
                          <div className="col-span-4">{line.product} / {line.plan}</div>
                          <div className="col-span-2">{line.qty}</div>
                          <div className="col-span-2">{formatCurrency(line.unitPrice)}</div>
                          <div className="col-span-4">
                            {formatDate(line.startDate)} → {formatDate(line.endDate)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Section>

                <div className="grid gap-2 md:grid-cols-2">
                  <Button variant="outline">契約票PDFを出力</Button>
                  <Button variant="outline">チェックリストCSV</Button>
                  <Button variant="default" onClick={() => setDetailModalOpen(true)}>
                    詳細情報
                  </Button>
                  <Button variant="default">更新/延長ドラフト</Button>
                  <Button variant="destructive" className="md:col-span-2">
                    解約（要承認）
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={detailModalOpen && !!selectedContract} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-h-[80vh] overflow-hidden">
          {selectedContract && (
            <ScrollArea className="h-full max-h-[70vh] pr-2">
              <DialogHeader>
                <DialogTitle>契約の詳細情報</DialogTitle>
                <DialogDescription>
                  {selectedContract.contractNumber} / {selectedContract.customerName}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pb-4">
                <Section title="請求情報">
                  <div className="grid gap-3 md:grid-cols-2">
                    <KeyValue label="請求先住所" value={extras?.billing?.billingAddress ?? "—"} />
                    <KeyValue label="請求サイクル" value={extras?.billing?.invoiceCycle ?? "—"} />
                    <KeyValue label="支払方法" value={extras?.billing?.paymentMethod ?? "—"} />
                    <KeyValue label="支払条件" value={extras?.billing?.paymentTerms ?? "—"} />
                    <KeyValue label="税率" value={extras?.billing?.taxRate ?? "—"} />
                    <KeyValue label="通貨" value={extras?.billing?.currency ?? "—"} />
                  </div>
                </Section>

                <Section title="連絡先">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">請求担当</div>
                      <div className="text-sm">{extras?.contacts?.billing?.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{extras?.contacts?.billing?.email ?? ""}</div>
                      <div className="text-xs text-muted-foreground">{extras?.contacts?.billing?.tel ?? ""}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">管理者</div>
                      <div className="text-sm">{extras?.contacts?.admin?.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{extras?.contacts?.admin?.email ?? ""}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">技術窓口</div>
                      <div className="text-sm">{extras?.contacts?.tech?.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{extras?.contacts?.tech?.email ?? ""}</div>
                    </div>
                  </div>
                </Section>

                <Section title="住所">
                  <div className="grid gap-3 md:grid-cols-2">
                    <KeyValue label="サービス提供先" value={extras?.addresses?.serviceAddress ?? "—"} />
                    <KeyValue label="出荷先" value={extras?.addresses?.shippingAddress ?? "—"} />
                  </div>
                </Section>

                <Section title="ルール / 規定">
                  <div className="grid gap-3 md:grid-cols-2">
                    <KeyValue
                      label="更新"
                      value={`${extras?.rules?.renewal?.type ?? "—"}（通知${extras?.rules?.renewal?.noticePeriodDays ?? "—"}日前）`}
                    />
                    <KeyValue label="解約" value={extras?.rules?.cancellation?.policy ?? "—"} />
                  </div>
                  {extras?.rules?.discounts && extras.rules.discounts.length > 0 && (
                    <div className="mt-2 text-sm">
                      <div className="text-xs text-muted-foreground">割引</div>
                      <ul className="list-disc pl-5">
                        {extras.rules.discounts.map((discount, index) => (
                          <li key={`${discount.rule}-${index}`}>{discount.rule}: {discount.value}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {extras?.rules?.sla && extras.rules.sla.length > 0 && (
                    <div className="mt-3 text-sm">
                      <div className="text-xs text-muted-foreground">SLA</div>
                      <div className="mt-1 overflow-hidden rounded-xl border">
                        <div className="grid grid-cols-12 bg-muted/60 px-3 py-2 text-xs font-semibold text-muted-foreground">
                          <div className="col-span-3">重大度</div>
                          <div className="col-span-3">一次応答</div>
                          <div className="col-span-3">復旧目標</div>
                          <div className="col-span-3">備考</div>
                        </div>
                        <div className="divide-y">
                          {extras.rules.sla.map((sla, index) => (
                            <div key={`${sla.severity}-${index}`} className="grid grid-cols-12 px-3 py-2">
                              <div className="col-span-3">{sla.severity}</div>
                              <div className="col-span-3">{sla.responseHrs} 時間</div>
                              <div className="col-span-3">{sla.restoreHrs} 時間</div>
                              <div className="col-span-3 text-muted-foreground">—</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </Section>

                {extras?.attachments && (
                  <Section title="添付">
                    <ul className="space-y-1 text-sm">
                      {extras.attachments.map((attachment, index) => (
                        <li key={`${attachment.name}-${index}`} className="flex items-center justify-between">
                          <span>
                            {attachment.name}{" "}
                            <span className="text-xs text-muted-foreground">({attachment.type}, {attachment.size})</span>
                          </span>
                          <Button variant="outline" size="sm">
                            開く
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}

                {extras?.notes && (
                  <Section title="メモ">
                    <ul className="space-y-1 pl-4 text-sm">
                      {extras.notes.map((note, index) => (
                        <li key={`${note}-${index}`} className="list-disc">
                          {note}
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
