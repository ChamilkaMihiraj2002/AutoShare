from pydantic import BaseModel


class PayHereCheckoutSessionRequest(BaseModel):
    rent_id: str


class PayHereCheckoutSessionResponse(BaseModel):
    action_url: str
    merchant_id: str
    return_url: str
    cancel_url: str
    notify_url: str
    first_name: str
    last_name: str
    email: str
    phone: str
    address: str
    city: str
    country: str
    order_id: str
    items: str
    currency: str
    amount: str
    hash: str
    sandbox: bool
