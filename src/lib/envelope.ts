// Денежные суммы — везде целые центы (integer cents), не float-доллары,
// чтобы не копить ошибки округления через десятки месяцев истории.

export type Envelope = {
  id: string;
  name: string;
  icon: string; // имя иконки lucide-react-native
  targetCents: number; // бюджет конверта за период (месяц)
  priority: number; // 0 = самый защищённый (не трогать при перераспределении), выше число = менее важный
  rollover: boolean; // переносить остаток/долг в следующий месяц или каждый раз сбрасывать к targetCents
  archived: boolean;
  createdAt: string; // ISO timestamp
};

export type Transaction = {
  id: string;
  envelopeId: string;
  amountCents: number; // всегда положительное — трата
  note: string;
  day: string; // YYYY-MM-DD
  createdAt: string;
};

export type Transfer = {
  id: string;
  fromEnvelopeId: string;
  toEnvelopeId: string;
  amountCents: number;
  month: string; // YYYY-MM — перераспределение бюджета конкретного месяца, не перевод реальных денег
  createdAt: string;
};
