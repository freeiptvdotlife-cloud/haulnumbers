import { useCallback, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { useScenarioStore } from "../scenarios/context";
import { NAME_MAX_LENGTH, type SavedScenario, type ToolId } from "../scenarios/store";
import { SPACING, useTheme } from "../theme";
import { Body, Button, Card, Field, Heading, Notice } from "./kit";

interface Props {
  toolId: ToolId;
  /** The calculator's current inputs; stored exactly as given. */
  snapshot: unknown;
  /** Called with the stored (untrusted) state; the screen sanitises it. */
  onLoad: (state: unknown) => void;
}

/** Save and reuse named sets of inputs. Everything stays on this phone. */
export function SavedScenarios({ toolId, snapshot, onLoad }: Props) {
  const t = useTheme();
  const store = useScenarioStore();
  const [items, setItems] = useState<SavedScenario[]>([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState<{ text: string; tone: "brand" | "bad" } | null>(null);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const refresh = useCallback(async () => {
    const list = await store.list(toolId);
    if (alive.current) setItems(list);
  }, [store, toolId]);
  useEffect(() => { void refresh(); }, [refresh]);

  const save = async () => {
    const r = await store.save(toolId, name, snapshot);
    if (!alive.current) return;
    if (!r.ok) { setMessage({ text: r.error, tone: "bad" }); return; }
    setName("");
    setMessage({ text: r.replaced ? `Updated “${r.scenario.name}”.` : `Saved “${r.scenario.name}”.`, tone: "brand" });
    await refresh();
  };

  return (
    <Card>
      <Heading>Saved scenarios</Heading>
      <Body muted>Save these inputs to use again later. They are stored only on this phone.</Body>
      <Field label="Name for this scenario" value={name} onChangeText={setName} keyboardType="default" testID="scenario-name" placeholder={`Up to ${NAME_MAX_LENGTH} characters`} />
      <Button title="Save" testID="scenario-save" onPress={() => { void save(); }} />
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      {items.map((s) => (
        <View key={s.id} style={{ borderTopWidth: 1, borderColor: t.line, paddingTop: SPACING.md, gap: SPACING.sm }}>
          <Text style={{ color: t.fg, fontWeight: "700", fontSize: 16 }}>{s.name}</Text>
          <Text style={{ color: t.muted, fontSize: 13 }}>{new Date(s.savedAt).toISOString().slice(0, 10)}</Text>
          <View style={{ flexDirection: "row", gap: SPACING.sm }}>
            <Button title="Load" label={`Load ${s.name}`} testID={`scenario-load-${s.name}`} onPress={() => { onLoad(s.state); setMessage({ text: `Loaded “${s.name}”.`, tone: "brand" }); }} />
            <Button title="Delete" label={`Delete ${s.name}`} testID={`scenario-delete-${s.name}`} onPress={() => { void store.remove(s.id).then(refresh); }} />
          </View>
        </View>
      ))}
    </Card>
  );
}
