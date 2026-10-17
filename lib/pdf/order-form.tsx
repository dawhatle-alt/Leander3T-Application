import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { LOGO_DATA_URI } from "./logo";

// Supplier order forms. The three layouts copy the legacy Documint forms
// (logo, centered company header, pale-blue label column, item tables) so
// suppliers see no change. Helvetica matches the legacy forms' Arial look.

// Never break words with hyphens ("Col-or"); wrap at spaces only.
Font.registerHyphenationCallback((word) => [word]);

export type FormHeader = {
  propertyAddress: string;
  subdivision: string;
  area: string;
  builder: string;
  company: string;
  requestedDate: string;
  deliveryPhone: string;
};

type Cell = string;

export type MasonryForm = {
  layout: "masonry";
  lintels: Cell[][]; // type, quantity, inches, hole pattern, notes
  arches: Cell[][]; // type, qty, span, width, rise, legs, notes
  sand: Cell[][]; // supplier, sand type, bags, yards, notes
  mortar: Cell[][]; // supplier, type, bags, notes
  rock: Cell[][]; // supplier, color/style, tons, stone drop, brick drop, notes
};

export type StuccoForm = {
  layout: "stucco";
  sandProvider: string;
  sandType: string;
  sandYards: string;
  sandNotes: string;
  mortarProvider: string;
  mortarType: string;
  mortarBags: string;
  mortarNotes: string;
  /** Catalog order; "foam" group prints in its own box like the legacy form. */
  items: { label: string; quantity: string; group: "supply" | "foam" }[];
  otherNotes: string;
};

export type PaintForm = {
  layout: "paint";
  bodyColor: string;
  bodyGallons: string;
  trimColor: string;
  trimGallons: string;
  otherNotes: string;
};

export type OrderFormData = {
  header: FormHeader;
  footer: string;
  body: MasonryForm | StuccoForm | PaintForm;
};

const BLUE = "#C9E1F0";
const ROSE = "#F5EFEE";
const INK = "#1F1F1F";
const RULE = "#9CB9CC";

const s = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 44,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: INK,
  },
  top: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  logo: { width: 84 },
  titleBlock: { flex: 1, alignItems: "center", marginRight: 84 },
  title: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9.5,
    textDecoration: "underline",
    lineHeight: 1.25,
  },
  info: {
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 10,
  },
  infoRow: { flexDirection: "row" },
  infoLabel: {
    width: 118,
    backgroundColor: BLUE,
    textAlign: "right",
    paddingVertical: 3.5,
    paddingRight: 6,
  },
  infoValue: { flex: 1, paddingVertical: 3.5, paddingLeft: 8 },
  sectionTitle: { fontSize: 11.5, marginTop: 14, marginBottom: 7 },
  centerHeading: {
    textAlign: "center",
    textDecoration: "underline",
    fontSize: 10,
    marginVertical: 8,
  },
  th: {
    flexDirection: "row",
    backgroundColor: BLUE,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tr: { flexDirection: "row", paddingVertical: 2.5, paddingHorizontal: 6 },
  box: {
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: ROSE,
    marginBottom: 8,
  },
  boxRow: { flexDirection: "row", minHeight: 22, alignItems: "stretch" },
  label: {
    backgroundColor: BLUE,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  value: { paddingHorizontal: 6, paddingVertical: 6 },
  footer: {
    position: "absolute",
    bottom: 22,
    left: 44,
    right: 44,
    textAlign: "center",
    fontSize: 7.5,
    color: "#7A7A7A",
  },
});

function Header({ title }: { title: string }) {
  return (
    <View style={s.top}>
      {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
      <Image src={LOGO_DATA_URI} style={s.logo} />
      <View style={s.titleBlock}>
        <Text style={s.title}>{title}</Text>
        <Text style={s.title}>Leander 3T, LLC</Text>
        <Text style={s.title}>
          Address: 127 Woodland Trail, Leander TX, 78641
        </Text>
        <Text style={s.title}>Office 512-260-2277</Text>
      </View>
    </View>
  );
}

function InfoBlock({ h, tinted }: { h: FormHeader; tinted: boolean }) {
  const rows: [string, string][] = [
    ["Property Address:", h.propertyAddress],
    ["Subdivision:", h.subdivision],
    ["Area:", h.area],
    ["Builder", h.builder],
    ["Company:", h.company],
    ["Requested Delivery Date:", h.requestedDate],
    ["Delivery Phone:", h.deliveryPhone],
  ];
  return (
    <View
      style={[
        s.info,
        tinted ? { backgroundColor: ROSE } : { width: 360, borderRadius: 0 },
      ]}
    >
      {rows.map(([label, value]) => (
        <View key={label} style={s.infoRow}>
          <Text style={s.infoLabel}>{label}</Text>
          <Text style={s.infoValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

function Table({
  title,
  columns,
  widths,
  rows,
}: {
  title: string;
  columns: string[];
  widths: number[];
  rows: Cell[][];
}) {
  if (!rows.length) return null;
  return (
    <View wrap={false}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.th}>
        {columns.map((c, i) => (
          <Text key={c} style={{ flex: widths[i] }}>
            {c}
          </Text>
        ))}
      </View>
      {rows.map((r, ri) => (
        <View key={ri} style={s.tr}>
          {r.map((c, i) => (
            <Text key={i} style={{ flex: widths[i] }}>
              {c}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function Masonry({ b }: { b: MasonryForm }) {
  return (
    <>
      <Table
        title="Lintel Orders"
        columns={["Type", "Quantity", "Inches", "Hole Pattern", "Notes"]}
        widths={[2, 1.2, 1.2, 2, 3.4]}
        rows={b.lintels}
      />
      <Table
        title="Arch Lintel Orders"
        columns={["Type", "Qty", "Span", "Width", "Rise", "Legs", "Notes"]}
        widths={[3.4, 0.8, 1, 1, 1, 0.8, 2.6]}
        rows={b.arches}
      />
      <Table
        title="Sand Orders"
        columns={["Supplier", "Sand Type", "Bags", "Yards", "Notes"]}
        widths={[3, 1.6, 0.9, 1.1, 3.2]}
        rows={b.sand}
      />
      <Table
        title="Mortar Order"
        columns={["Supplier", "Type", "Bags", "Notes"]}
        widths={[2.2, 1.6, 1.4, 4.6]}
        rows={b.mortar}
      />
      <Table
        title="Rock Orders"
        columns={[
          "Supplier",
          "Color / Style",
          "Tons",
          "Stone Drop",
          "Brick Drop",
          "Notes",
        ]}
        widths={[2, 2.2, 0.9, 1.2, 1.2, 2.5]}
        rows={b.rock}
      />
    </>
  );
}

function PairBox({
  rows,
}: {
  rows: [string, string, string, string][]; // label, value, label, value
}) {
  return (
    <View style={s.box} wrap={false}>
      {rows.map(([l1, v1, l2, v2], i) => (
        <View key={i} style={s.boxRow}>
          <Text style={[s.label, { width: 78 }]}>{l1}</Text>
          <Text style={[s.value, { width: 82 }]}>{v1}</Text>
          <Text style={[s.label, { width: 66 }]}>{l2}</Text>
          <Text style={[s.value, { flex: 1 }]}>{v2}</Text>
        </View>
      ))}
    </View>
  );
}

function ItemGrid({ items }: { items: StuccoForm["items"] }) {
  if (!items.length) return null;
  const half = Math.ceil(items.length / 2);
  const left = items.slice(0, half);
  const right = items.slice(half);
  const col = (list: StuccoForm["items"], border: boolean) => (
    <View
      style={[
        { flex: 1 },
        border ? { borderLeftWidth: 1.5, borderLeftColor: INK } : {},
      ]}
    >
      {list.map((it) => (
        <View
          key={it.label}
          style={[
            s.boxRow,
            { borderBottomWidth: 0.5, borderBottomColor: RULE },
          ]}
        >
          <Text style={[s.label, { flex: 1, fontSize: 8 }]}>{it.label}</Text>
          <Text style={[s.value, { width: 62, textAlign: "center" }]}>
            {it.quantity}
          </Text>
        </View>
      ))}
    </View>
  );
  return (
    <View style={[s.box, { flexDirection: "row" }]} wrap={false}>
      {col(left, false)}
      {col(right, true)}
    </View>
  );
}

function NotesBox({ text }: { text: string }) {
  return (
    <View style={[s.box, { flexDirection: "row", minHeight: 46 }]} wrap={false}>
      <Text style={[s.label, { width: 96, textDecoration: "underline" }]}>
        Other Items & Notes:
      </Text>
      <Text style={[s.value, { flex: 1 }]}>{text}</Text>
    </View>
  );
}

function Stucco({ b }: { b: StuccoForm }) {
  return (
    <>
      <Text style={s.centerHeading}>Items for Delivery:</Text>
      <PairBox
        rows={[
          ["Sand Provider:", b.sandProvider, "# of Yards:", b.sandYards],
          ["Sand Type:", b.sandType, "Notes:", b.sandNotes],
        ]}
      />
      <PairBox
        rows={[
          ["Mortar Provider:", b.mortarProvider, "# of Bags:", b.mortarBags],
          ["Mortar Type:", b.mortarType, "Notes:", b.mortarNotes],
        ]}
      />
      <ItemGrid items={b.items.filter((i) => i.group === "supply")} />
      <ItemGrid items={b.items.filter((i) => i.group === "foam")} />
      <NotesBox text={b.otherNotes} />
    </>
  );
}

function Paint({ b }: { b: PaintForm }) {
  const row = (l1: string, v1: string, l2: string, v2: string) => (
    <View style={[s.box, { flexDirection: "row" }]} wrap={false}>
      <Text style={[s.label, { width: 92 }]}>{l1}</Text>
      <Text style={[s.value, { flex: 1 }]}>{v1}</Text>
      <Text style={[s.label, { width: 92 }]}>{l2}</Text>
      <Text style={[s.value, { width: 80 }]}>{v2}</Text>
    </View>
  );
  return (
    <>
      <Text style={s.centerHeading}>Elastomeric Stucco Paint Order Items:</Text>
      {row("Body Paint Color:", b.bodyColor, "Body Gallons:", b.bodyGallons)}
      {row("Trim Paint Color:", b.trimColor, "Trim Gallons:", b.trimGallons)}
      <NotesBox text={b.otherNotes} />
    </>
  );
}

const TITLE = {
  masonry: "Masonry Supply Order Form",
  stucco: "Stucco Supply Order Form",
  paint: "Paint Supply Order Form",
} as const;

export function OrderFormPdf({ data }: { data: OrderFormData }) {
  const { header, body, footer } = data;
  return (
    <Document
      title={`${TITLE[body.layout]} — ${header.propertyAddress}`}
      author="Leander 3T, LLC"
    >
      <Page size="LETTER" style={s.page}>
        <Header title={TITLE[body.layout]} />
        <InfoBlock h={header} tinted={body.layout !== "masonry"} />
        {body.layout === "masonry" && <Masonry b={body} />}
        {body.layout === "stucco" && <Stucco b={body} />}
        {body.layout === "paint" && <Paint b={body} />}
        <Text style={s.footer} fixed>
          {footer}
        </Text>
      </Page>
    </Document>
  );
}
