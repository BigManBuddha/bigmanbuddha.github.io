import { ROLE_OPTIONS } from '../../domain/constants';
import type { Role } from '../../domain/types';
import { useSlate } from '../../state/SlateProvider';
import { Button } from '../../ui/Button';
import { Select, TextArea } from '../../ui/Field';
import { PageHeader } from '../../ui/Headings';
import screen from '../shared/Screen.module.css';
import styles from './Messages.module.css';

/** Editable message templates. Edits save as you type. */
export function MessagesScreen() {
  const { state, act } = useSlate();

  return (
    <div className={screen.screen} data-screen-label="Messages">
      <PageHeader
        title="Messages"
        sub="Type straight into any template; it saves as you go. Templates tagged with an action open pre-filled when you use that action. [Client], [Contact name], [date] and [Your name] fill in automatically."
        actions={<Button variant="primary" onClick={act.addTemplate}>+ New template</Button>}
      />

      <div className={styles.grid}>
        {state.templates.map((t) => (
          <div key={t.id} className={styles.card}>
            <div className={styles.cardTop}>
              <Select
                className={styles.role}
                value={t.role}
                onChange={(e) => act.setTemplateRole(t.id, e.target.value as Role)}
                aria-label="What this template is for"
              >
                {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
              <div className={styles.cardButtons}>
                <Button size="sm" variant="primary" onClick={() => act.copyTemplate(t)}>Copy</Button>
                {t.role === 'custom' && <Button size="sm" variant="danger" onClick={() => act.deleteTemplate(t.id)}>Delete</Button>}
              </div>
            </div>
            <input
              className={styles.title}
              value={t.title}
              onChange={(e) => act.editTemplate(t.id, 'title', e.target.value)}
              placeholder="Template name"
              aria-label="Template name"
            />
            <TextArea
              className={styles.body}
              value={t.body}
              onChange={(e) => act.editTemplate(t.id, 'body', e.target.value)}
              placeholder="Write your message."
              aria-label="Template text"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
