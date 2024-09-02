import { ContentTypes, Constants } from 'librechat-data-provider';
import type { TMessage } from 'librechat-data-provider';

export const getLengthAndLastTenChars = (str?: string): string => {
  if (typeof str !== 'string' || str.length === 0) {
    return '0';
  }

  const length = str.length;
  const lastTenChars = str.slice(-10);
  return `${length}${lastTenChars}`;
};

export const getLatestText = (message?: TMessage | null, includeIndex?: boolean) => {
  if (!message) {
    return '';
  }
  if (message.text) {
    return message.text;
  }
  if (message.content && message.content.length > 0) {
    for (let i = message.content.length - 1; i >= 0; i--) {
      const part = message.content[i];
      if (
        part.type === ContentTypes.TEXT &&
        ((part[ContentTypes.TEXT].value as string | undefined)?.length ?? 0) > 0
      ) {
        const text = part[ContentTypes.TEXT].value;
        if (includeIndex === true) {
          return `${text}-${i}`;
        } else {
          return text;
        }
      } else {
        continue;
      }
    }
  }
  return '';
};

export const getTextKey = (message?: TMessage | null, convoId?: string | null) => {
  if (!message) {
    return '';
  }
  const text = getLatestText(message, true);
  return `${(message.messageId as string | null) ?? ''}${
    Constants.COMMON_DIVIDER
  }${getLengthAndLastTenChars(text)}${Constants.COMMON_DIVIDER}${
    message.conversationId ?? convoId
  }`;
};

export const scrollToEnd = (callback?: () => void) => {
  const messagesEndElement = document.getElementById('messages-end');
  if (messagesEndElement) {
    messagesEndElement.scrollIntoView({ behavior: 'instant' });
    if (callback) {
      callback();
    }
  }
};
