'use client';

import { useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import { Bot, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Agent } from '@/types';

interface AgentButtonProps {
  agent: Agent;
  isSelected: boolean;
  onSelect: (agent: Agent) => void;
  onEdit: (agent: Agent) => void;
  onDelete: (agent: Agent) => void;
}

export function AgentButton({
  agent,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
}: AgentButtonProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const contextMenuIntentRef = useRef(false);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      contextMenuIntentRef.current = false;
      setIsDropdownOpen(false);
      return;
    }

    if (contextMenuIntentRef.current) {
      contextMenuIntentRef.current = false;
      setIsDropdownOpen(true);
    }
  };

  const handleContextMenu = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    contextMenuIntentRef.current = true;
    setIsDropdownOpen(true);
  };

  const handleClick = () => {
    if (isDropdownOpen) {
      setIsDropdownOpen(false);
    }
    onSelect(agent);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(agent);
      return;
    }

    if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
      event.preventDefault();
      contextMenuIntentRef.current = true;
      setIsDropdownOpen(true);
    }
  };

  return (
    <DropdownMenu open={isDropdownOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant={isSelected ? 'default' : 'outline'}
          size="sm"
          className="gap-2"
          onClick={handleClick}
          onContextMenu={handleContextMenu}
          onKeyDown={handleKeyDown}
        >
          <Bot className="h-4 w-4" />
          {agent.name}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => onEdit(agent)}>
          <Edit2 className="mr-2 h-4 w-4" />
          Edit {agent.name}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onDelete(agent)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete {agent.name}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
