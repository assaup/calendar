{{- define "calendar.tag" -}}
{{ .Values.image.tag | default .Chart.AppVersion }}
{{- end }}

{{/* (dict "root" $ "component" "backend") */}}
{{- define "calendar.image" -}}
{{ printf "%s/calendar-%s:%s" .root.Values.image.registry .component (include "calendar.tag" .root) }}
{{- end }}

{{- define "calendar.selectorLabels" -}}
app.kubernetes.io/name: {{ .component }}
app.kubernetes.io/instance: {{ .root.Release.Name }}
{{- end }}

{{- define "calendar.labels" -}}
{{ include "calendar.selectorLabels" . }}
app.kubernetes.io/part-of: calendar
app.kubernetes.io/version: {{ include "calendar.tag" .root | quote }}
app.kubernetes.io/managed-by: {{ .root.Release.Service }}
helm.sh/chart: {{ printf "%s-%s" .root.Chart.Name .root.Chart.Version }}
{{- end }}

{{- define "calendar.backendSecret" -}}
{{ .Values.backend.existingSecret | default "backend" }}
{{- end }}

{{- define "calendar.databaseUrl" -}}
{{- if .Values.backend.databaseUrl -}}
{{ .Values.backend.databaseUrl }}
{{- else if .Values.postgres.enabled -}}
{{- /* shortcut: urlquery превращает пробел в "+", пароли с пробелами не поддерживаются */ -}}
{{ printf "postgres://%s:%s@db:5432/%s" (urlquery .Values.postgres.user) (urlquery .Values.postgres.password) .Values.postgres.database }}
{{- else -}}
{{ fail "нужен backend.databaseUrl или backend.existingSecret, раз postgres.enabled=false" }}
{{- end }}
{{- end }}

{{/* общий env для бэкенда и миграций */}}
{{- define "calendar.backendEnvFrom" -}}
- configMapRef:
    name: backend
- secretRef:
    name: {{ include "calendar.backendSecret" . }}
{{- end }}
