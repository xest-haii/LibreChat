import { useRecoilState } from 'recoil';
import { Settings2 } from 'lucide-react';
import { Root, Anchor } from '@radix-ui/react-popover';
import { useState, useEffect, useMemo } from 'react';
import { tPresetUpdateSchema, EModelEndpoint, paramEndpoints } from 'librechat-data-provider';
import type { TPreset, TInterfaceConfig } from 'librechat-data-provider';
import { EndpointSettings, SaveAsPresetDialog, AlternativeSettings } from '~/components/Endpoints';
import { ModelSelect } from '~/components/Input/ModelSelect';
import { PluginStoreDialog } from '~/components';
import OptionsPopover from './OptionsPopover';
import PopoverButtons from './PopoverButtons';
import { useSetIndexOptions } from '~/hooks';
import { useChatContext } from '~/Providers';
import { Button } from '~/components/ui';
import store from '~/store';

export default function HeaderOptions({
  interfaceConfig,
}: {
  interfaceConfig?: Partial<TInterfaceConfig>;
}) {
  const [saveAsDialogShow, setSaveAsDialogShow] = useState<boolean>(false);
  const [showPluginStoreDialog, setShowPluginStoreDialog] = useRecoilState(
    store.showPluginStoreDialog,
  );

  const { showPopover, conversation, latestMessage, setShowPopover, setShowBingToneSetting } =
    useChatContext();
  const { setOption } = useSetIndexOptions();

  const { endpoint, conversationId, jailbreak = false } = conversation ?? {};

  const altConditions: { [key: string]: boolean } = {
    bingAI: !!(latestMessage && jailbreak && endpoint === 'bingAI'),
  };

  const altSettings: { [key: string]: () => void } = {
    bingAI: () => setShowBingToneSetting((prev) => !prev),
  };

  const noSettings = useMemo<{ [key: string]: boolean }>(
    () => ({
      [EModelEndpoint.chatGPTBrowser]: true,
      [EModelEndpoint.bingAI]: jailbreak ? false : conversationId !== 'new',
    }),
    [jailbreak, conversationId],
  );

  useEffect(() => {
    if (endpoint && noSettings[endpoint]) {
      setShowPopover(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, noSettings]);

  const saveAsPreset = () => {
    setSaveAsDialogShow(true);
  };

  if (!endpoint) {
    return null;
  }

  const triggerAdvancedMode = altConditions[endpoint]
    ? altSettings[endpoint]
    : () => setShowPopover((prev) => !prev);
  return (
    <Root
      open={showPopover}
      // onOpenChange={} //  called when the open state of the popover changes.
    >
      <Anchor>
        <div className="my-auto lg:max-w-2xl xl:max-w-3xl">
          <span className="flex w-full flex-col items-center justify-center gap-0 md:order-none md:m-auto md:gap-2">
            <div className="z-[61] flex w-full items-center justify-center gap-2">
              {interfaceConfig?.modelSelect === true && (
                <ModelSelect
                  conversation={conversation}
                  setOption={setOption}
                  showAbove={false}
                  popover={true}
                />
              )}
              {!noSettings[endpoint] &&
                interfaceConfig?.parameters === true &&
                !paramEndpoints.has(endpoint) && (
                <Button
                  aria-label="Settings/parameters"
                  id="parameters-button"
                  data-testid="parameters-button"
                  type="button"
                  variant="outline"
                  onClick={triggerAdvancedMode}
                  className="flex h-[40px] min-w-4 px-3 radix-state-open:bg-surface-hover"
                >
                  <Settings2 className="w-4 text-gray-600 dark:text-white" />
                </Button>
              )}
            </div>
            {interfaceConfig?.parameters === true && !paramEndpoints.has(endpoint) && (
              <OptionsPopover
                visible={showPopover}
                saveAsPreset={saveAsPreset}
                presetsDisabled={!(interfaceConfig.presets ?? false)}
                PopoverButtons={<PopoverButtons />}
                closePopover={() => setShowPopover(false)}
              >
                <div className="px-4 py-4">
                  <EndpointSettings
                    className="[&::-webkit-scrollbar]:w-2"
                    conversation={conversation}
                    setOption={setOption}
                  />
                  <AlternativeSettings conversation={conversation} setOption={setOption} />
                </div>
              </OptionsPopover>
            )}
            {interfaceConfig?.presets === true && (
              <SaveAsPresetDialog
                open={saveAsDialogShow}
                onOpenChange={setSaveAsDialogShow}
                preset={
                  tPresetUpdateSchema.parse({
                    ...conversation,
                  }) as TPreset
                }
              />
            )}
            {interfaceConfig?.parameters === true && (
              <PluginStoreDialog
                isOpen={showPluginStoreDialog}
                setIsOpen={setShowPluginStoreDialog}
              />
            )}
          </span>
        </div>
      </Anchor>
    </Root>
  );
}
