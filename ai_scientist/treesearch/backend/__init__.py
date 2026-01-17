from . import backend_anthropic, backend_openai
from .utils import FunctionSpec, OutputType, PromptType, compile_prompt_to_md

def get_ai_client(model: str, **model_kwargs):
    """
    Get the appropriate AI client based on the model string.

    Args:
        model (str): string identifier for the model to use (e.g. "gpt-4-turbo")
        **model_kwargs: Additional keyword arguments for model configuration.
    Returns:
        An instance of the appropriate AI client.
    """
    if "claude-" in model:
        return backend_anthropic.get_ai_client(model=model, **model_kwargs)
    else:
        return backend_openai.get_ai_client(model=model, **model_kwargs)

def query(
    system_message: PromptType | None,
    user_message: PromptType | None,
    model: str,
    temperature: float | None = None,
    max_tokens: int | None = None,
    func_spec: FunctionSpec | None = None,
    **model_kwargs,
) -> OutputType:
    """
    General LLM query for various backends with a single system and user message.
    Supports function calling for some backends.

    Args:
        system_message (PromptType | None): Uncompiled system message (will generate a message following the OpenAI/Anthropic format)
        user_message (PromptType | None): Uncompiled user message (will generate a message following the OpenAI/Anthropic format)
        model (str): string identifier for the model to use (e.g. "gpt-4-turbo")
        temperature (float | None, optional): Temperature to sample at. Defaults to the model-specific default.
        max_tokens (int | None, optional): Maximum number of tokens to generate. Defaults to the model-specific max tokens.
        func_spec (FunctionSpec | None, optional): Optional FunctionSpec object defining a function call. If given, the return value will be a dict.

    Returns:
        OutputType: A string completion if func_spec is None, otherwise a dict with the function call details.
    """

    model_kwargs = model_kwargs | {
        "model": model,
        "temperature": temperature,
    }

    # Models that require a user message (no system-only calls)
    if ("gemini" in model or model.startswith("o1") or model.startswith("o3")):
        if system_message and user_message is None:
            user_message = system_message
            system_message = None
        elif system_message and user_message:
            # Merge system into user for models that don't support system messages
            if model.startswith("o1") or model.startswith("o3"):
                system_message["Main Instructions"] = {}
                system_message["Main Instructions"] |= user_message
                user_message = system_message
                system_message = None

    # Reasoning models: o1, o3, gpt-5
    if model.startswith("o1") or model.startswith("o3"):
        model_kwargs["reasoning_effort"] = model_kwargs.get("reasoning_effort", "high")
        model_kwargs["max_completion_tokens"] = max_tokens or 100000
        model_kwargs.pop("temperature", None)
    elif model.startswith("gpt-5"):
        # GPT-5: medium default, GPT-5.1/5.2: none default but we want medium for quality
        model_kwargs["reasoning_effort"] = model_kwargs.get("reasoning_effort", "medium")
        model_kwargs["max_completion_tokens"] = max_tokens
        model_kwargs.pop("max_tokens", None)
    else:
        model_kwargs["max_tokens"] = max_tokens

    query_func = backend_anthropic.query if "claude-" in model else backend_openai.query
    output, req_time, in_tok_count, out_tok_count, info = query_func(
        system_message=compile_prompt_to_md(system_message) if system_message else None,
        user_message=compile_prompt_to_md(user_message) if user_message else None,
        func_spec=func_spec,
        **model_kwargs,
    )

    return output
