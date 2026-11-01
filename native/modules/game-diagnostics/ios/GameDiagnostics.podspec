Pod::Spec.new do |s|
  s.name = 'GameDiagnostics'
  s.version = '0.1.0'
  s.summary = 'Local, opt-in performance context for Humans Remain.'
  s.description = 'Samples process memory, thermal state and power mode during an explicit performance recording.'
  s.license = { :type => 'Proprietary' }
  s.author = 'Humans Remain'
  s.homepage = 'https://github.com/matthewsmart212/humans-remain'
  s.source = { :git => 'https://github.com/matthewsmart212/humans-remain.git' }
  s.platforms = { :ios => '16.4' }
  s.swift_version = '5.9'
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.{h,m,swift}'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES', 'SWIFT_COMPILATION_MODE' => 'wholemodule' }
end
