import { useState } from 'react';
import type { MessageDraft } from '../../state/appState';
import { useSlate } from '../../state/SlateProvider';
import { Button } from '../../ui/Button';
import { TextArea } from '../../ui/Field';
import { FooterStart, Panel } from '../../ui/Panel';
import styles from './Messages.module.css';

/**
 * A filled-in message to copy into email or text. If it came from an action
 * (Invite back, Release), nothing changes until the user presses Confirm.
 */
export function MessagePanel({ message }: { message: MessageDraft }) {
  const { act } = useSlate();
  const [body, setBody] = useState(message.body);
  const [copied, setCopied] = useState(message.copied);
  const { pending } = message;

  const copy = async () => { await act.copyText(body); setCopied(true); };

  return (
    <Panel
      title={message.title}
      subtitle={message.subtitle}
      width={640}
      onClose={act.closePanel}
      notice={pending && `Nothing changes until you confirm. Closing leaves ${pending.clientName} exactly as they are.`}
      footer={(
        <>
          {copied && <FooterStart><span className={styles.copied}>Copied</span></FooterStart>}
          <Button onClick={act.closePanel}>Cancel</Button>
          <Button variant={pending ? 'ghost' : 'primary'} onClick={copy}>Copy message</Button>
          {pending && <Button variant="primary" onClick={act.confirmPending}>{pending.confirmLabel}</Button>}
        </>
      )}
    >
      <TextArea
        className={styles.message}
        value={body}
        onChange={(e) => { setBody(e.target.value); setCopied(false); }}
        aria-label="Message"
      />
    </Panel>
  );
}
