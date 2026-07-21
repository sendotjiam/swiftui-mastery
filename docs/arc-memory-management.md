# ARC and Memory Management

## Memory Management

### [Beginner] What is ARC?
**Interview answer:**  
ARC, Automatic Reference Counting, manages class instance memory by tracking strong references. When the strong reference count reaches zero, the instance is deallocated and `deinit` runs.

**Deep explanation:**  
ARC handles memory for reference types automatically, but it does not understand ownership cycles. If two objects strongly reference each other, both counts stay above zero and neither deallocates.

**Why it matters:**  
iOS apps are memory constrained. Leaks cause increased memory usage, performance degradation, and eventual termination.

**How it works:**  
The compiler inserts retain and release operations around reference lifetimes. Strong references increment the count. Weak references do not. When the count reaches zero, Swift destroys the object.

**Use cases:**  
View controllers, view models, services, delegates, closures, timers, notifications, and async callbacks.

**Common mistakes:**  
Thinking ARC prevents all leaks. Forgetting closure retain cycles. Using `unowned` when the referenced object may outlive its owner.

**Best practices:**  
Design clear ownership. Use `weak` for back-references and delegates. Verify deallocation for complex flows.

**Red flag answers:**  
"Swift has garbage collection." ARC is deterministic reference counting, not tracing garbage collection.

**Code example:**  
```swift
final class DetailViewModel {
    deinit {
        print("DetailViewModel deallocated")
    }
}
```

**Possible follow-up questions:**  
How does ARC differ from garbage collection? Why do retain cycles leak?

### [Intermediate] What is the difference between stack and heap memory?
**Interview answer:**  
The stack is fast, scoped storage for function calls and local values. The heap is dynamic storage for values that need flexible lifetime or reference identity. In Swift, semantics matter more than assuming exact placement.

**Deep explanation:**  
Stack allocation is cheap and follows call lifetimes. Heap allocation is more flexible but requires allocation, deallocation, and often ARC traffic. Swift can optimize storage, so "struct equals stack" is not reliable.

**Why it matters:**  
It helps explain performance trade-offs without making false claims. Large values, escaping closures, class instances, and shared buffers often involve heap allocation.

**How it works:**  
Function frames hold local storage and return addresses. Heap objects are allocated from a dynamic memory region and referenced indirectly. The compiler may promote, inline, or eliminate allocations.

**Use cases:**  
Performance analysis, memory pressure debugging, ARC traffic reduction, and avoiding unnecessary object allocation in hot paths.

**Common mistakes:**  
Equating stack/heap with struct/class in all cases. Optimizing based on folklore instead of profiling.

**Best practices:**  
Choose value/reference semantics first. Profile allocations with Instruments before changing architecture for memory placement.

**Red flag answers:**  
"Structs are always stack allocated." This is false in optimized Swift code and when values are captured, stored, boxed, or part of heap-backed storage.

**Code example:**  
```swift
func makeClosure() -> () -> Int {
    let value = 42
    return { value } // Captured value must outlive the stack frame.
}
```

**Possible follow-up questions:**  
When can a closure allocate? How does escape analysis help optimization?

### [Beginner] What are strong, weak, and unowned references?
**Interview answer:**  
`strong` keeps an object alive. `weak` does not keep it alive and becomes `nil` when the object deallocates. `unowned` does not keep it alive and assumes the object is still alive; accessing it after deallocation crashes.

**Deep explanation:**  
Strong references express ownership. Weak references express optional non-ownership. Unowned references express non-optional non-ownership with a strict lifetime guarantee.

**Why it matters:**  
Correct reference strength prevents memory leaks and crashes.

**How it works:**  
ARC increments counts for strong references. Weak references are tracked separately and zeroed on deallocation. Unowned references are not zeroed in the same safe optional way.

**Use cases:**  
Strong: parent owns child. Weak: delegate, parent pointer, view controller callback. Unowned: child points to parent when parent definitely outlives child.

**Common mistakes:**  
Using `unowned` to avoid optional handling. Making delegates strong. Using weak references for objects that need to be retained.

**Best practices:**  
Prefer `weak` unless you can prove the lifetime invariant. Delegates should usually be weak. Ownership should be visible in API design.

**Red flag answers:**  
"Use unowned because it is faster." Safety beats micro-optimization.

**Code example:**  
```swift
protocol PaymentCoordinatorDelegate: AnyObject {
    func paymentDidFinish()
}

final class PaymentCoordinator {
    weak var delegate: PaymentCoordinatorDelegate?
}
```

**Possible follow-up questions:**  
Why must weak references be optional? When is `unowned` appropriate?

### [Intermediate] What is a retain cycle?
**Interview answer:**  
A retain cycle happens when objects strongly reference each other so ARC can never reduce their reference counts to zero.

**Deep explanation:**  
ARC works locally by counting references. It does not scan object graphs looking for unreachable cycles. A cycle can involve two objects, a closure stored by an object, timers, notification tokens, tasks, or delegates.

**Why it matters:**  
Retain cycles keep screens, view models, network clients, and resources alive after users leave a flow.

**How it works:**  
If `A` strongly owns `B` and `B` strongly owns `A`, both counts remain positive. For closure cycles, `self` owns a closure property and the closure strongly captures `self`.

**Use cases:**  
Diagnosing leaked view controllers, Combine subscriptions, repeating timers, stored callbacks, and coordinator graphs.

**Common mistakes:**  
Only checking direct property cycles and ignoring closure cycles. Assuming `deinit` will always run.

**Best practices:**  
Make back-references weak. In stored closures that refer to owner, capture `self` weakly or capture specific dependencies. Invalidate timers and subscriptions.

**Red flag answers:**  
"ARC will clean it eventually." It will not if the cycle remains.

**Code example:**  
```swift
final class SearchViewModel {
    var onResults: (() -> Void)?

    func configure() {
        onResults = { [weak self] in
            self?.refreshUIState()
        }
    }

    private func refreshUIState() {}
}
```

**Possible follow-up questions:**  
Can value types participate in retain cycles? How do Combine subscriptions create cycles?

### [Intermediate] Why is `[weak self]` used?
**Interview answer:**  
`[weak self]` prevents a closure from strongly retaining its owner when the closure may outlive the owner or is stored by the owner.

**Deep explanation:**  
Closures strongly capture objects by default. If a view model stores a closure and that closure captures the view model, the two can retain each other. Weak capture breaks the ownership cycle.

**Why it matters:**  
It prevents leaked view controllers, view models, coordinators, and cells in common asynchronous and callback-heavy code.

**How it works:**  
The capture list stores a weak optional reference. Inside the closure, `self` is optional because the object may have deallocated by execution time.

**Use cases:**  
Network completion handlers, animation completions, Combine `sink`, timers, notification handlers, and stored callback properties.

**Common mistakes:**  
Using weak self in short non-escaping closures where it is unnecessary. Guarding self and then starting long work without thinking about desired lifetime.

**Best practices:**  
Ask: who owns the closure, and can it outlive `self`? If yes, weak is often right. Capture specific collaborators when that is clearer.

**Red flag answers:**  
"Always use weak self in async code." Sometimes the task should keep the object alive until work finishes; sometimes cancellation should control lifetime.

**Code example:**  
```swift
final class FeedViewModel {
    private let service: FeedService

    init(service: FeedService) {
        self.service = service
    }

    func load() {
        service.fetch { [weak self] result in
            guard let self else { return }
            self.handle(result)
        }
    }

    private func handle(_ result: Result<[Post], Error>) {}
}
```

**Possible follow-up questions:**  
When should you avoid `[weak self]`? How do you handle optional self elegantly?

### [Senior] When should you not use `[weak self]`?
**Interview answer:**  
Do not use `[weak self]` when the closure cannot outlive `self`, when `self` must stay alive for the operation to be correct, or when ownership is better expressed through cancellation or explicit lifetime management.

**Deep explanation:**  
Weak capture is a memory tool, not a default style rule. If a user taps Save and the view model should finish a write even if the view disappears, weakly dropping the closure may silently cancel important work. Conversely, if the work is view-scoped, using a cancellable task may be better than weak self.

**Why it matters:**  
Mechanical weak captures create subtle bugs: missing analytics, incomplete saves, skipped cleanup, and nondeterministic behavior.

**How it works:**  
If `self` deallocates before the closure runs, `self` becomes `nil` and the closure often returns early. That changes behavior.

**Use cases:**  
Non-escaping closures, synchronous collection methods, transactions that must complete, dependency capture, and explicit task ownership.

**Common mistakes:**  
Treating weak capture as a universal leak fix. Ignoring whether the closure is stored. Weakly capturing `self` in `Task` but not cancelling the task.

**Best practices:**  
Model lifecycle intentionally. For view-scoped async work, use `.task` or store/cancel a `Task`. For required work, move it to a service that owns the operation.

**Red flag answers:**  
"Weak self has no downside." It has semantic consequences.

**Code example:**  
```swift
// No weak self needed: map's closure is non-escaping.
let names = users.map { user in
    user.name.uppercased()
}

// Capture a dependency instead of all of self.
final class PurchaseViewModel {
    private let analytics: AnalyticsTracking

    init(analytics: AnalyticsTracking) {
        self.analytics = analytics
    }

    func trackPurchase() {
        Task { [analytics] in
            await analytics.track("purchase")
        }
    }
}
```

**Possible follow-up questions:**  
How do tasks affect object lifetime? How can you prove a closure is non-escaping?

### [Intermediate] How do closures capture variables?
**Interview answer:**  
Closures capture values they use from surrounding scope. By default, object references are captured strongly; capture lists can change capture strength or capture a snapshot value.

**Deep explanation:**  
Capturing a mutable local variable can preserve shared mutable storage, so later changes may be visible to the closure. A capture list like `[count]` captures the current value at closure creation.

**Why it matters:**  
Capture semantics affect memory, race conditions, stale UI data, and correctness of delayed work.

**How it works:**  
The compiler builds storage for captured variables and references it from the closure object. Capture lists initialize captured values before the closure body runs.

**Use cases:**  
Delayed logging, animation callbacks, task closures, event handlers, and retry logic.

**Common mistakes:**  
Expecting a closure to always capture a snapshot. Capturing `self` when only one property or service is needed.

**Best practices:**  
Capture specific values or services intentionally. Use `[value]` when delayed work needs a snapshot.

**Red flag answers:**  
"Closures copy everything." Capture behavior depends on variable/value/reference semantics and capture lists.

**Code example:**  
```swift
var query = "swift"

let liveCapture = {
    print(query)
}

let snapshotCapture = { [query] in
    print(query)
}

query = "swiftui"
liveCapture()     // swiftui
snapshotCapture() // swift
```

**Possible follow-up questions:**  
How do capture lists interact with value types? Can a struct capture a class reference?

### [Intermediate] How do you find memory leaks in iOS?
**Interview answer:**  
Use Instruments, especially Leaks and Allocations, plus Xcode's Memory Graph Debugger. Confirm expected objects deallocate, inspect retain cycles, and reproduce the flow repeatedly.

**Deep explanation:**  
Memory debugging is evidence-driven. A growing memory graph does not always mean a leak; caches and system frameworks may retain memory intentionally. A leak is memory that remains reachable unintentionally after its expected lifetime.

**Why it matters:**  
Leaks degrade performance, trigger memory warnings, and can terminate apps under pressure.

**How it works:**  
Memory Graph shows object references at a point in time. Leaks detects unreachable allocations. Allocations tracks allocation patterns over time. `deinit` logs can confirm lifetime but are not enough by themselves.

**Use cases:**  
View controller leaks, Combine subscription cycles, timers, notification observers, image caches, and retain cycles in coordinators.

**Common mistakes:**  
Assuming one retained object is a leak without knowing expected ownership. Relying only on `deinit` print statements. Ignoring repeating timers and notification tokens.

**Best practices:**  
Create a minimal reproduce path. Navigate in and out multiple times. Check owner chains. Fix one ownership problem at a time.

**Red flag answers:**  
"Just add weak everywhere." That can break ownership and hide the root cause.

**Code example:**  
```swift
final class ScreenViewModel {
    deinit {
        assertionFailure("Remove after leak investigation: ScreenViewModel deallocated")
    }
}
```

**Possible follow-up questions:**  
What is the difference between Leaks and Allocations? How can a timer cause a leak?
