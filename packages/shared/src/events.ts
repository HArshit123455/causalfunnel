import { z } from 'zod';

export const EVENT_TYPES = ['page_view', 'click'] as const;
export const EventType = z.enum(EVENT_TYPES);

const BaseEvent = z.object({
  sessionId: z.string().uuid(),
  url: z.string().url().max(2048),
  path: z.string().max(2048),
  timestamp: z.coerce.date(),
  userAgent: z.string().max(512).optional().default(''),
  referrer: z.string().max(2048).nullable().optional().default(null),
});

export const PageViewEvent = BaseEvent.extend({
  type: z.literal('page_view'),
  x: z.null().optional().default(null),
  y: z.null().optional().default(null),
  pageX: z.null().optional().default(null),
  pageY: z.null().optional().default(null),
  viewportW: z.null().optional().default(null),
  viewportH: z.null().optional().default(null),
  selector: z.null().optional().default(null),
});

export const ClickEvent = BaseEvent.extend({
  type: z.literal('click'),
  x: z.number().int().min(0).max(20000),
  y: z.number().int().min(0).max(20000),
  pageX: z.number().int().min(0).max(200000),
  pageY: z.number().int().min(0).max(200000),
  viewportW: z.number().int().min(0).max(20000),
  viewportH: z.number().int().min(0).max(20000),
  selector: z.string().max(512).nullable().default(null),
});

export const TrackingEvent = z.discriminatedUnion('type', [PageViewEvent, ClickEvent]);
export const TrackingEventBatch = z.union([TrackingEvent, z.array(TrackingEvent).max(100)]);

export type TrackingEventInput = z.input<typeof TrackingEvent>;
export type TrackingEventParsed = z.output<typeof TrackingEvent>;

export const SessionSummary = z.object({
  sessionId: z.string(),
  firstSeen: z.coerce.date(),
  lastSeen: z.coerce.date(),
  eventCount: z.number().int().nonnegative(),
  pageCount: z.number().int().nonnegative(),
  durationMs: z.number().int().nonnegative(),
});
export type SessionSummary = z.infer<typeof SessionSummary>;

export const HeatmapPoint = z.object({
  x: z.number(), y: z.number(),
  pageX: z.number(), pageY: z.number(),
  viewportW: z.number(), viewportH: z.number(),
});
export type HeatmapPoint = z.infer<typeof HeatmapPoint>;

export const PageInfo = z.object({
  path: z.string(),
  clickCount: z.number().int().nonnegative(),
});
export type PageInfo = z.infer<typeof PageInfo>;
