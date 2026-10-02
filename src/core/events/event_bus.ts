import type { DomainEvent } from "./domain_events.js"

export type EventType = DomainEvent["type"]
export type EventHandler<T extends EventType = EventType> = (
    event: Extract<DomainEvent, { type: T }>,
) => void | Promise<void>
export type AnyEventHandler = (event: DomainEvent) => void | Promise<void>

export class EventBus {
    private handlers = new Map<EventType, Set<EventHandler<any>>>()
    private allHandlers = new Set<AnyEventHandler>()

    /**
     * Subscribe to a specific event type. Returns an unsubscribe function.
     */
    public subscribe<T extends EventType>(type: T, handler: EventHandler<T>): () => void {
        let set = this.handlers.get(type)
        if (!set) {
            set = new Set()
            this.handlers.set(type, set)
        }
        set.add(handler)

        return () => {
            set?.delete(handler)
            if (set && set.size === 0) {
                this.handlers.delete(type)
            }
        }
    }

    /**
     * Subscribe to all domain events. Returns an unsubscribe function.
     */
    public subscribeAll(handler: AnyEventHandler): () => void {
        this.allHandlers.add(handler)
        return () => {
            this.allHandlers.delete(handler)
        }
    }

    /**
     * Publish an event to all registered listeners.
     * Handlers execute safely with error isolation.
     */
    public publish(event: DomainEvent): void {
        const specificHandlers = this.handlers.get(event.type)
        if (specificHandlers) {
            for (const handler of specificHandlers) {
                try {
                    const result = handler(event as any)
                    if (result instanceof Promise) {
                        result.catch((err) => {
                            console.error(`[EventBus] Async handler error for ${event.type}:`, err)
                        })
                    }
                } catch (err) {
                    console.error(`[EventBus] Sync handler error for ${event.type}:`, err)
                }
            }
        }

        for (const handler of this.allHandlers) {
            try {
                const result = handler(event)
                if (result instanceof Promise) {
                    result.catch((err) => {
                        console.error(`[EventBus] Async wildcard handler error for ${event.type}:`, err)
                    })
                }
            } catch (err) {
                console.error(`[EventBus] Sync wildcard handler error for ${event.type}:`, err)
            }
        }
    }

    /**
     * Remove all handlers (useful in tests).
     */
    public clear(): void {
        this.handlers.clear()
        this.allHandlers.clear()
    }
}

// Global default singleton instance for convenience, while allowing dependency injection
export const globalEventBus = new EventBus()
