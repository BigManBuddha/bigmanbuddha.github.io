import { useState, type ChangeEvent } from 'react';
import { draftSummary } from '../../domain/caseload';
import type { Client, ClientDraft } from '../../domain/types';
import { newClientDraft } from '../../state/actions';
import { confirmBox } from '../../services/browser';
import { useSlate } from '../../state/SlateProvider';
import { Button } from '../../ui/Button';
import { Field, FieldGrid, Select, TextArea, TextInput } from '../../ui/Field';
import { FooterStart, Panel } from '../../ui/Panel';
import styles from './ClientPanel.module.css';

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/** Add or edit a client. Changes are kept in the form until Save. */
export function ClientPanel({ client }: { client: Client | null }) {
  const { state, act, today } = useSlate();
  const [draft, setDraft] = useState<ClientDraft>(() => (client ? { ...client } : newClientDraft(today)));
  const isNew = !client;

  const bind = (key: keyof ClientDraft) => ({
    value: String(draft[key] ?? ''),
    onChange: (e: ChangeEvent<Control>) => setDraft((d) => ({ ...d, [key]: e.target.value }) as ClientDraft),
  });

  const remove = () => { if (client && confirmBox(`Delete ${client.name}? This can't be undone.`)) act.deleteClient(client.id); };

  return (
    <Panel
      title={isNew ? 'Add client' : 'Edit client'}
      onClose={act.closePanel}
      footer={(
        <>
          {!isNew && <FooterStart><Button variant="danger" onClick={remove}>Delete</Button></FooterStart>}
          <Button onClick={act.closePanel}>Cancel</Button>
          <Button variant="primary" onClick={() => act.saveClient(draft)}>Save</Button>
        </>
      )}
    >
      <Field label="Client name or initials" hint="Initials or an ID are enough. Less identifying data is safer if a device is lost.">
        <TextInput {...bind('name')} placeholder="e.g. A.R. or a client ID" autoFocus />
      </Field>
      <Field label="Contact name" optional>
        <TextInput {...bind('contact')} placeholder="e.g. parent or next of kin" />
      </Field>

      <FieldGrid>
        <Field label="Frequency">
          <Select {...bind('frequency')}>
            {state.settings.frequencies.map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
          </Select>
        </Field>
        <Field label="Status">
          <Select {...bind('status')}>
            <option value="Active">Active</option>
            <option value="Holding">Holding</option>
            <option value="Discharged">Discharged</option>
          </Select>
        </Field>
        <Field label="Block start date">
          <TextInput {...bind('blockStart')} type="date" />
        </Field>
        <Field label="Block length (sessions)">
          <TextInput {...bind('blockLength')} type="number" inputMode="numeric" min={0} />
        </Field>
        <Field label="Pushed back (weeks)">
          <TextInput {...bind('pushedBack')} type="number" inputMode="numeric" placeholder="0" />
        </Field>
        <Field label="Likely to re-book?">
          <Select {...bind('rebook')}>
            <option value="">Unsure</option>
            <option value="Likely to continue">Likely to continue</option>
            <option value="Likely to finish">Likely to finish</option>
          </Select>
        </Field>
      </FieldGrid>

      {draft.status === 'Holding' && (
        <Field label="Reply by (while holding their slot)">
          <TextInput {...bind('replyBy')} type="date" />
        </Field>
      )}

      <Field label="Notes">
        <TextArea {...bind('notes')} rows={3} placeholder="Anything you want to remember" />
      </Field>

      {draft.name.trim() && <p className={styles.summary}>{draftSummary(draft, state.settings, today)}</p>}
    </Panel>
  );
}
