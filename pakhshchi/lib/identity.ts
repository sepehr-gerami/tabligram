/**
 * DEMO-ONLY identity helpers.
 *
 * There is no backend yet, so every visitor is treated as the same demo publisher
 * ("کاربر نمونه") and their pages carry this owner id. This is NOT authentication
 * and NOT a security boundary: anything stored in localStorage can be edited.
 * Real ownership checks must live on the server once the backend exists
 * (`insta_pages.owner_id` in the planned schema).
 */
export const DEMO_USER_ID = "u-demo";
export const DEMO_USER_NAME = "کاربر نمونه";

export const isDemoOwner = (ownerId: string | null | undefined) => ownerId === DEMO_USER_ID;
