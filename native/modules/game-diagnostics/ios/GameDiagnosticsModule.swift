import ExpoModulesCore
import Foundation
import Darwin
import os

/// Explicit recording only. AsyncFunction executes away from the JS runtime;
/// this module installs no timer, display link, listener or background task.
public class GameDiagnosticsModule: Module {
  private static let log = OSLog(subsystem: "com.safetylast.game-performance", category: .pointsOfInterest)

  public func definition() -> ModuleDefinition {
    Name("GameDiagnostics")

    AsyncFunction("sample") { (session: Int, sequence: Int) -> [String: Any] in
      let process = ProcessInfo.processInfo
      let started = process.systemUptime
      var memory = task_vm_info_data_t()
      let capacity = MemoryLayout<task_vm_info_data_t>.size / MemoryLayout<integer_t>.size
      var count = mach_msg_type_number_t(capacity)
      let result = withUnsafeMutablePointer(to: &memory) { pointer in
        pointer.withMemoryRebound(to: integer_t.self, capacity: capacity) {
          task_info(mach_task_self_, task_flavor_t(TASK_VM_INFO), $0, &count)
        }
      }
      let thermal: String
      switch process.thermalState {
      case .nominal: thermal = "nominal"
      case .fair: thermal = "fair"
      case .serious: thermal = "serious"
      case .critical: thermal = "critical"
      @unknown default: thermal = "unknown"
      }
      let sampledAt = process.systemUptime
      var context: [String: Any] = [
        "session": session,
        "sequence": sequence,
        "nativeUptimeMs": sampledAt * 1000,
        "nativeSampleMs": (sampledAt - started) * 1000,
        "thermalState": thermal,
        "lowPowerMode": process.isLowPowerModeEnabled,
        "memoryStatus": Int(result),
        "memoryAvailable": result == KERN_SUCCESS
      ]
      if result == KERN_SUCCESS {
        context["residentBytes"] = Double(memory.resident_size)
        context["physicalFootprintBytes"] = Double(memory.phys_footprint)
      }
      // Pair this numeric marker with the exported context's session/sequence.
      // It identifies a sample, not GPU completion or a displayed frame.
      os_signpost(.event, log: Self.log, name: "Device Context",
                  "session=%{public}ld sample=%{public}ld", session, sequence)
      return context
    }
  }
}
