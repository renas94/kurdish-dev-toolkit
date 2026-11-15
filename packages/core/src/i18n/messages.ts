/**
 * Starter UI messages. These are common interface strings, not a complete translation of any
 * application. Corrections from native speakers are welcome (see CONTRIBUTING.md).
 *
 * Sorani nouns stay singular after a number (`٣ پەیام`, "3 messages"), so `one` and `other` often
 * read the same. They are both kept so that keys line up with English.
 */
export const soraniMessages = {
  common: {
    save: 'پاشەکەوتکردن',
    cancel: 'هەڵوەشاندنەوە',
    delete: 'سڕینەوە',
    edit: 'دەستکاریکردن',
    search: 'گەڕان',
    close: 'داخستن',
    submit: 'ناردن',
    back: 'گەڕانەوە',
    next: 'دواتر',
    previous: 'پێشوو',
    yes: 'بەڵێ',
    no: 'نەخێر',
    loading: 'چاوەڕێ بکە...',
    language: 'زمان',
    settings: 'ڕێکخستنەکان',
  },
  auth: {
    login: 'چوونەژوورەوە',
    logout: 'چوونەدەرەوە',
    register: 'خۆتۆمارکردن',
    email: 'ئیمەیڵ',
    password: 'وشەی نهێنی',
    welcome: 'بەخێربێیت، {name}!',
  },
  validation: {
    required: 'ئەم خانەیە پێویستە',
    email: 'ئیمەیڵەکە دروست نییە',
    minLength: 'لانیکەم {min} پیت بنووسە',
  },
  messages: {
    count: {
      zero: 'هیچ پەیامێک نییە',
      one: '{count} پەیام',
      other: '{count} پەیام',
    },
  },
} as const;

/** English messages with the same keys as {@link soraniMessages}. */
export const englishMessages = {
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    search: 'Search',
    close: 'Close',
    submit: 'Submit',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    yes: 'Yes',
    no: 'No',
    loading: 'Loading...',
    language: 'Language',
    settings: 'Settings',
  },
  auth: {
    login: 'Log in',
    logout: 'Log out',
    register: 'Sign up',
    email: 'Email',
    password: 'Password',
    welcome: 'Welcome, {name}!',
  },
  validation: {
    required: 'This field is required',
    email: 'The email address is not valid',
    minLength: 'Enter at least {min} characters',
  },
  messages: {
    count: {
      zero: 'No messages',
      one: '{count} message',
      other: '{count} messages',
    },
  },
} as const;
