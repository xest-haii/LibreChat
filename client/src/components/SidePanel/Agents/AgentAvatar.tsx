import * as Popover from '@radix-ui/react-popover';
import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  fileConfig as defaultFileConfig,
  QueryKeys,
  defaultOrderQuery,
  mergeFileConfig,
} from 'librechat-data-provider';
import type { UseMutationResult } from '@tanstack/react-query';
import type {
  Agent,
  AgentAvatar,
  AgentCreateParams,
  AgentListResponse,
} from 'librechat-data-provider';
import { useUploadAgentAvatarMutation, useGetFileConfig } from '~/data-provider';
import { AgentAvatarRender, NoImage, AvatarMenu } from './Images';
import { useToastContext } from '~/Providers';
import { useLocalize } from '~/hooks';
import { formatBytes } from '~/utils';

function Avatar({
  agent_id,
  avatar,
  createMutation,
}: {
  agent_id: string | null;
  avatar: null | AgentAvatar;
  createMutation: UseMutationResult<Agent, Error, AgentCreateParams>;
}) {
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [progress, setProgress] = useState<number>(1);
  const [input, setInput] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const lastSeenCreatedId = useRef<string | null>(null);
  const { data: fileConfig = defaultFileConfig } = useGetFileConfig({
    select: (data) => mergeFileConfig(data),
  });

  const localize = useLocalize();
  const { showToast } = useToastContext();

  const { mutate: uploadAvatar } = useUploadAgentAvatarMutation({
    onMutate: () => {
      setProgress(0.4);
    },
    onSuccess: (data, vars) => {
      if (vars.postCreation === false) {
        showToast({ message: localize('com_ui_upload_success') });
      } else if (lastSeenCreatedId.current !== createMutation.data?.id) {
        lastSeenCreatedId.current = createMutation.data?.id ?? '';
      }

      setInput(null);
      setPreviewUrl(data.avatar?.filepath as string | null);

      const res = queryClient.getQueryData<AgentListResponse>([
        QueryKeys.agents,
        defaultOrderQuery,
      ]);

      if (!res?.data) {
        return;
      }

      const agents =
        res.data.map((agent) => {
          if (agent.id === agent_id) {
            return {
              ...agent,
              ...data,
            };
          }
          return agent;
        }) ?? [];

      queryClient.setQueryData<AgentListResponse>([QueryKeys.agents, defaultOrderQuery], {
        ...res,
        data: agents,
      });

      setProgress(1);
    },
    onError: (error) => {
      console.error('Error:', error);
      setInput(null);
      setPreviewUrl(null);
      showToast({ message: localize('com_ui_upload_error'), status: 'error' });
      setProgress(1);
    },
  });

  useEffect(() => {
    if (input) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(input);
    }
  }, [input]);

  useEffect(() => {
    if (avatar) {
      setPreviewUrl((avatar.filepath as string | undefined) ?? null);
    }
  }, [avatar]);

  useEffect(() => {
    /** Experimental: Condition to prime avatar upload before Agent Creation
     * - If the createMutation state Id was last seen (current) and the createMutation is successful
     * we can assume that the avatar upload has already been initiated and we can skip the upload
     *
     * The mutation state is not reset until the user deliberately selects a new agent or an agent is deleted
     *
     * This prevents the avatar from being uploaded multiple times before the user selects a new agent
     * while allowing the user to upload to prime the avatar and other values before the agent is created.
     */
    const sharedUploadCondition = !!(
      createMutation.isSuccess &&
      input &&
      previewUrl &&
      previewUrl.includes('base64')
    );
    if (sharedUploadCondition && lastSeenCreatedId.current === createMutation.data.id) {
      return;
    }

    if (sharedUploadCondition && createMutation.data.id) {
      const formData = new FormData();
      formData.append('file', input, input.name);
      formData.append('agent_id', createMutation.data.id);

      if (typeof createMutation.data.avatar === 'object') {
        formData.append('avatar', JSON.stringify(createMutation.data.avatar));
      }

      uploadAvatar({
        agent_id: createMutation.data.id,
        postCreation: true,
        formData,
      });
    }
  }, [createMutation.data, createMutation.isSuccess, input, previewUrl, uploadAvatar]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];

    if (fileConfig.avatarSizeLimit && file && file.size <= fileConfig.avatarSizeLimit) {
      setInput(file);
      setMenuOpen(false);

      if (!agent_id) {
        return;
      }

      const formData = new FormData();
      formData.append('file', file, file.name);
      formData.append('agent_id', agent_id);

      if (typeof avatar === 'object') {
        formData.append('avatar', JSON.stringify(avatar));
      }

      uploadAvatar({
        agent_id,
        formData,
      });
    } else {
      const megabytes = fileConfig.avatarSizeLimit ? formatBytes(fileConfig.avatarSizeLimit) : 2;
      showToast({
        message: localize('com_ui_upload_invalid_var', megabytes + ''),
        status: 'error',
      });
    }

    setMenuOpen(false);
  };

  return (
    <Popover.Root open={menuOpen} onOpenChange={setMenuOpen}>
      <div className="flex w-full items-center justify-center gap-4">
        <Popover.Trigger asChild>
          <button type="button" className="h-20 w-20">
            {previewUrl ? <AgentAvatarRender url={previewUrl} progress={progress} /> : <NoImage />}
          </button>
        </Popover.Trigger>
      </div>
      {<AvatarMenu handleFileChange={handleFileChange} />}
    </Popover.Root>
  );
}

export default Avatar;
