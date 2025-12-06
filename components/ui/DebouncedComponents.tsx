import React, { useState, useEffect, useRef } from 'react';

export const DebouncedInput = ({ 
    value, 
    onChange, 
    onFocus,
    placeholder, 
    className,
    type = "text",
    disabled,
    ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { onFocus?: () => void }) => {
    const [localValue, setLocalValue] = useState(value as string);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => { setLocalValue(value as string); }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setLocalValue(val);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => onChange({ target: { value: val } } as any), 300);
    };

    return (
        <input 
            type={type}
            value={localValue} 
            onChange={handleChange} 
            onFocus={onFocus}
            placeholder={placeholder} 
            className={className} 
            disabled={disabled}
            {...props}
        />
    );
};

export const DebouncedTextarea = ({ 
    value, 
    onChange, 
    placeholder, 
    className,
    disabled,
    onClick,
    onFocus,
    ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => {
    const [localValue, setLocalValue] = useState(value as string);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => { setLocalValue(value as string); }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setLocalValue(val);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => onChange({ target: { value: val } } as any), 300);
    };

    return (
        <textarea 
            value={localValue} 
            onChange={handleChange} 
            placeholder={placeholder} 
            className={className} 
            onClick={onClick}
            onFocus={onFocus}
            disabled={disabled}
            {...props}
        />
    );
};