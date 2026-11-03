// Written by bin/export-rules.php from Support\BuilderRules. Do not edit.
declare const rules: {
    readonly "page": {
        readonly "version": 2;
        readonly "max_sections": 30;
        readonly "max_name_length": 40;
        readonly "max_title_length": 120;
    };
    readonly "style": {
        readonly "variants": readonly ["desktop", "tablet", "phone", "hover"];
        readonly "keys": {
            readonly "padding_top": "length";
            readonly "padding_right": "length";
            readonly "padding_bottom": "length";
            readonly "padding_left": "length";
            readonly "margin_top": "length";
            readonly "margin_bottom": "length";
            readonly "width": "length";
            readonly "max_width": "length";
            readonly "min_height": "length";
            readonly "gap": "length";
            readonly "color": "color";
            readonly "background_color": "color";
            readonly "border_color": "color";
            readonly "font_family": "font";
            readonly "font_size": "length";
            readonly "letter_spacing": "length";
            readonly "font_weight": "weight";
            readonly "line_height": "line_height";
            readonly "text_transform": "choice";
            readonly "text_align": "choice";
            readonly "border_width": "length";
            readonly "border_style": "choice";
            readonly "radius": "radius";
            readonly "shadow": "shadow";
            readonly "opacity": "opacity";
        };
        readonly "non_negative": readonly ["padding_top", "padding_right", "padding_bottom", "padding_left", "width", "max_width", "min_height", "gap", "font_size", "line_height", "border_width", "radius"];
        readonly "hover_keys": readonly ["color", "background_color", "border_color", "shadow", "opacity"];
        readonly "choices": {
            readonly "text_transform": readonly ["none", "uppercase", "lowercase", "capitalize"];
            readonly "text_align": readonly ["left", "center", "right", "justify"];
            readonly "border_style": readonly ["none", "solid", "dashed", "dotted"];
        };
        readonly "shadows": readonly ["none", "sm", "md", "lg", "xl"];
        readonly "font_weights": readonly ["300", "400", "500", "600", "700", "800", "900"];
        readonly "length_units": {
            readonly "px": 2000;
            readonly "rem": 200;
            readonly "em": 200;
            readonly "%": 100;
            readonly "vw": 100;
            readonly "vh": 100;
        };
        readonly "line_height": {
            readonly "min": 0.8;
            readonly "max": 3;
        };
        readonly "opacity": {
            readonly "min": 0;
            readonly "max": 1;
        };
        readonly "kit_key": "[a-z0-9-]{1,30}";
    };
    readonly "advanced": {
        readonly "class_name": "[A-Za-z][A-Za-z0-9_-]{0,40}";
        readonly "reserved_class_prefix": "fbe-";
        readonly "max_classes": 5;
        readonly "devices": readonly ["desktop", "tablet", "phone"];
        readonly "max_css_length": 5000;
    };
    readonly "form": {
        readonly "field_types": readonly ["text", "email", "tel", "number", "date", "textarea", "select", "radio", "checkboxes", "consent"];
        readonly "choice_types": readonly ["select", "radio", "checkboxes"];
        readonly "action_types": readonly ["email", "whatsapp", "redirect", "webhook"];
        readonly "submit_aligns": readonly ["left", "center", "right", "full"];
        readonly "max_fields": 30;
        readonly "max_options": 30;
        readonly "field_name": "[a-z][a-z0-9_]{0,39}";
        readonly "field_name_length": 40;
        readonly "field_id_length": 40;
        readonly "label_length": 200;
        readonly "placeholder_length": 200;
        readonly "name_length": 200;
        readonly "submit_length": 80;
        readonly "success_length": 500;
        readonly "subject_length": 200;
        readonly "message_length": 1000;
        readonly "email_length": 200;
        readonly "webhook_length": 500;
        readonly "rows": {
            readonly "min": 2;
            readonly "max": 10;
            readonly "default": 4;
        };
    };
    readonly "locks": readonly ["move", "remove", "content", "style"];
    readonly "kit": {
        readonly "version": 1;
        readonly "colors": readonly ["primary", "secondary", "accent", "text", "muted", "background", "surface", "border"];
        readonly "max_custom_colors": 12;
        readonly "custom_label_length": 60;
        readonly "button_styles": readonly ["solid", "outline", "pill", "shadow"];
        readonly "button_sizes": readonly ["sm", "md", "lg"];
        readonly "form_styles": readonly ["outline", "filled", "underline"];
        readonly "form_labels": readonly ["above", "hidden"];
        readonly "text_transforms": readonly ["none", "uppercase", "lowercase", "capitalize"];
        readonly "defaults": {
            readonly "version": 1;
            readonly "colors": {
                readonly "primary": "#2563eb";
                readonly "secondary": "#0f172a";
                readonly "accent": "#f59e0b";
                readonly "text": "#475569";
                readonly "muted": "#64748b";
                readonly "background": "#ffffff";
                readonly "surface": "#f8fafc";
                readonly "border": "#e2e8f0";
            };
            readonly "custom_colors": readonly [];
            readonly "fonts": {
                readonly "heading": "theme";
                readonly "body": "theme";
            };
            readonly "text": {
                readonly "base_size": "1.0625rem";
                readonly "heading_weight": "800";
            };
            readonly "radius": "1.25rem";
            readonly "buttons": {
                readonly "style": "solid";
                readonly "radius": "0.75rem";
                readonly "size": "md";
                readonly "text_transform": "none";
                readonly "font_weight": "800";
            };
            readonly "forms": {
                readonly "style": "outline";
                readonly "radius": "0.75rem";
                readonly "labels": "above";
            };
        };
    };
    readonly "document_kinds": readonly ["page", "header", "footer", "section", "card", "single"];
    readonly "part_kinds": readonly ["header", "footer"];
    readonly "dynamic_key": "[a-z][a-z0-9_]*(?:\\.[a-z0-9_]+){1,3}";
};

export default rules;
