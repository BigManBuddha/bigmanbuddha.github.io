import type { MouseEvent } from 'react';
import { ACTION_META } from '../../domain/constants';
import { clientButtons, clientSubtitle, type ClientCommand } from '../../domain/caseload';
import type { ComputedClient } from '../../domain/types';
import { useSlate } from '../../state/SlateProvider';
import { ActionRow } from '../../ui/ActionRow';
import { Button, type ButtonSize } from '../../ui/Button';

/** The buttons a client needs right now (Invite back, Send chase, Release…). */
export function ClientButtons({ client, limit, size = 'sm' }: { client: ComputedClient; limit?: number; size?: ButtonSize }) {
  const { act } = useSlate();

  const run = (command: ClientCommand) => {
    switch (command) {
      case 'invite': return act.inviteBack(client);
      case 'mark-decided': return act.updateClient(client.id, { decided: true });
      case 'chase': return act.sendChase(client);
      case 'release': return act.release(client);
      case 'reactivate': return act.updateClient(client.id, { status: 'Active' });
      case 'undo-decided': return act.updateClient(client.id, { decided: false });
    }
  };

  const specs = clientButtons(client.action).slice(0, limit);
  return (
    <>
      {specs.map((b) => (
        <Button
          key={b.command}
          size={size}
          variant={b.variant}
          onClick={(e: MouseEvent) => { e.stopPropagation(); run(b.command); }}
        >
          {b.label}
        </Button>
      ))}
    </>
  );
}

/** A client row led by their status tag, with their action buttons. */
export function ClientActionRow({ client }: { client: ComputedClient }) {
  const meta = ACTION_META[client.action];
  return (
    <ActionRow tone={meta.tone} label={meta.label} name={client.name} detail={clientSubtitle(client)}>
      <ClientButtons client={client} />
    </ActionRow>
  );
}
