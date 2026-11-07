import { useState, type ChangeEvent } from 'react';
import type { WaitlistEntry } from '../../domain/types';
import { confirmBox } from '../../services/browser';
import { newWaitDraft } from '../../state/actions';
import { useSlate } from '../../state/SlateProvider';
import { Button } from '../../ui/Button';
import { Field, FieldGrid, Select, TextArea, TextInput } from '../../ui/Field';
import { FooterStart, Panel } from '../../ui/Panel';

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/** Add or edit a waitlist entry. */
export function WaitlistPanel({ entry }: { entry: WaitlistEntry | null }) {
  const { state, act, today } = useSlate();
  const [draft, setDraft] = useState<WaitlistEntry>(() => (entry ? { ...entry } : newWaitDraft(today)));
  const isNew = !entry;

  const bind = (key: keyof WaitlistEntry) => ({
    value: draft[key],
    onChange: (e: ChangeEvent<Control>) => setDraft((d) => ({ ...d, [key]: e.target.value })),
  });

  const remove = () => { if (entry && confirmBox(`Remove ${entry.name} from the waitlist?`)) act.deleteWait(entry.id); };

  return (
    <Panel
      title={isNew ? 'Add to waitlist' : 'Edit waitlist entry'}
      width={520}
      onClose={act.closePanel}
      footer={(
        <>
          {!isNew && <FooterStart><Button variant="danger" onClick={remove}>Remove</Button></FooterStart>}
          <Button onClick={act.closePanel}>Cancel</Button>
          <Button variant="primary" onClick={() => act.saveWait(draft)}>Save</Button>
        </>
      )}
    >
      <Field label="Name">
        <TextInput {...bind('name')} placeholder="Who's waiting" autoFocus />
      </Field>
      <Field label="Needs (frequency)">
        <Select {...bind('need')}>
          {state.settings.frequencies.map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
        </Select>
      </Field>
      <FieldGrid>
        <Field label="Date added"><TextInput {...bind('added')} type="date" /></Field>
        <Field label="Last contacted"><TextInput {...bind('lastContacted')} type="date" /></Field>
      </FieldGrid>
      <Field label="Notes">
        <TextArea {...bind('notes')} rows={3} />
      </Field>
    </Panel>
  );
}
