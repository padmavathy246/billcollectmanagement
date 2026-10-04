const SUPABASE_URL = "https://tonmguetotjoiyjhabel.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_Tc5xuLPeqOwEQmP7ZG0TlA_nJIn-ZdD";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const PASSWORD = "rose@123";

/*
  IMPORTANT:
  These are the two database tables used by this dashboard.

  customers:
  id, name, phone, loan_amount, interest, duration,
  start_date, created_at

  payments:
  id, customer_id, amount, payment_date, note, created_at
*/

let customers = [];
let payments = [];

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("todayText").textContent =
    new Date().toLocaleDateString("en-IN");

  document.getElementById("startDate").value =
    new Date().toISOString().split("T")[0];

  document.getElementById("paymentDate").value =
    new Date().toISOString().split("T")[0];

  if (sessionStorage.getItem("finance_logged_in") === "yes") {
    showApp();
  }
});

function login() {
  const password =
    document.getElementById("loginPassword").value.trim();

  if (password === PASSWORD) {
    sessionStorage.setItem("finance_logged_in", "yes");
    showApp();
  } else {
    document.getElementById("loginError").textContent =
      "Wrong password";
  }
}

function logout() {
  sessionStorage.removeItem("finance_logged_in");
  location.reload();
}

function showApp() {
  document.getElementById("loginPage").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  loadAllData();
}

async function loadAllData() {
  try {
    const customerResult = await supabaseClient
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });

    if (customerResult.error) {
      throw customerResult.error;
    }

    const paymentResult = await supabaseClient
      .from("payments")
      .select("*")
      .order("payment_date", { ascending: false });

    if (paymentResult.error) {
      throw paymentResult.error;
    }

    customers = customerResult.data || [];
    payments = paymentResult.data || [];

    renderCustomers();
    updateDashboard();

  } catch (error) {
    console.error(error);

    alert(
      "Database error:\n\n" +
      error.message +
      "\n\nSupabase table names must be customers and payments."
    );
  }
}

document
  .getElementById("customerForm")
  .addEventListener("submit", async function (event) {

    event.preventDefault();

    const editId =
      document.getElementById("editId").value;

    const data = {
      name:
        document.getElementById("customerName").value.trim(),

      phone:
        document.getElementById("phone").value.trim(),

      loan_amount:
        Number(document.getElementById("loanAmount").value),

      interest:
        Number(document.getElementById("interest").value || 0),

      duration:
        Number(document.getElementById("duration").value || 1),

      start_date:
        document.getElementById("startDate").value
    };

    if (!data.name || data.loan_amount <= 0) {
      alert("Customer name and loan amount are required.");
      return;
    }

    try {

      if (editId) {

        const result = await supabaseClient
          .from("customers")
          .update(data)
          .eq("id", editId);

        if (result.error) {
          throw result.error;
        }

        alert("Customer updated successfully.");

      } else {

        const result = await supabaseClient
          .from("customers")
          .insert([data]);

        if (result.error) {
          throw result.error;
        }

        alert("Customer added successfully.");
      }

      resetForm();
      await loadAllData();

    } catch (error) {
      console.error(error);
      alert("Save failed:\n" + error.message);
    }
  });

function calculateTotal(customer) {
  const loan = Number(customer.loan_amount || 0);
  const interest = Number(customer.interest || 0);

  return loan + (loan * interest / 100);
}

function customerCollected(customerId) {
  return payments
    .filter(p => String(p.customer_id) === String(customerId))
    .reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0
    );
}

function customerBalance(customer) {
  return Math.max(
    0,
    calculateTotal(customer) -
    customerCollected(customer.id)
  );
}

function formatMoney(amount) {
  return "₹" + Number(amount || 0).toLocaleString("en-IN");
}

function renderCustomers() {

  const tbody =
    document.getElementById("customerTable");

  const search =
    document.getElementById("searchBox")
      .value
      .toLowerCase()
      .trim();

  const filtered = customers.filter(c =>
    String(c.name || "")
      .toLowerCase()
      .includes(search) ||
    String(c.phone || "")
      .toLowerCase()
      .includes(search)
  );

  tbody.innerHTML = "";

  if (filtered.length === 0) {

    tbody.innerHTML =
      `<tr>
        <td colspan="9" style="text-align:center">
          No customers found
        </td>
      </tr>`;

    return;
  }

  filtered.forEach((customer, index) => {

    const total =
      calculateTotal(customer);

    const collected =
      customerCollected(customer.id);

    const balance =
      Math.max(0, total - collected);

    const row =
      document.createElement("tr");

    row.innerHTML = `
      <td>${index + 1}</td>

      <td>
        <strong>${escapeHtml(customer.name)}</strong>
      </td>

      <td>${escapeHtml(customer.phone || "")}</td>

      <td>${formatMoney(customer.loan_amount)}</td>

      <td>${customer.interest || 0}%</td>

      <td>${formatMoney(total)}</td>

      <td>${formatMoney(collected)}</td>

      <td>
        <strong>${formatMoney(balance)}</strong>
      </td>

      <td>

        <button
          class="action-btn pay-btn"
          onclick="openPayment('${customer.id}')">
          Payment
        </button>

        <button
          class="action-btn edit-btn"
          onclick="editCustomer('${customer.id}')">
          Edit
        </button>

        <button
          class="action-btn delete-btn"
          onclick="deleteCustomer('${customer.id}')">
          Delete
        </button>

      </td>
    `;

    tbody.appendChild(row);
  });
}

async function editCustomer(id) {

  const customer =
    customers.find(
      c => String(c.id) === String(id)
    );

  if (!customer) return;

  document.getElementById("editId").value =
    customer.id;

  document.getElementById("customerName").value =
    customer.name || "";

  document.getElementById("phone").value =
    customer.phone || "";

  document.getElementById("loanAmount").value =
    customer.loan_amount || "";

  document.getElementById("interest").value =
    customer.interest || 0;

  document.getElementById("duration").value =
    customer.duration || 1;

  document.getElementById("startDate").value =
    customer.start_date || "";

  document.querySelector(".save-btn").textContent =
    "Update Customer";

  document
    .getElementById("cancelEdit")
    .classList.remove("hidden");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function resetForm() {

  document.getElementById("customerForm").reset();

  document.getElementById("editId").value = "";

  document.getElementById("startDate").value =
    new Date().toISOString().split("T")[0];

  document.querySelector(".save-btn").textContent =
    "Save Customer";

  document
    .getElementById("cancelEdit")
    .classList.add("hidden");
}

function cancelEdit() {
  resetForm();
}

async function deleteCustomer(id) {

  const customer =
    customers.find(
      c => String(c.id) === String(id)
    );

  if (!customer) return;

  const ok =
    confirm(
      "Delete " +
      customer.name +
      "?\n\nAll payment records for this customer will also be deleted."
    );

  if (!ok) return;

  try {

    const paymentDelete =
      await supabaseClient
        .from("payments")
        .delete()
        .eq("customer_id", id);

    if (paymentDelete.error) {
      throw paymentDelete.error;
    }

    const customerDelete =
      await supabaseClient
        .from("customers")
        .delete()
        .eq("id", id);

    if (customerDelete.error) {
      throw customerDelete.error;
    }

    alert("Customer deleted.");

    await loadAllData();

  } catch (error) {

    console.error(error);

    alert(
      "Delete failed:\n" +
      error.message
    );
  }
}

function openPayment(customerId) {

  const customer =
    customers.find(
      c => String(c.id) === String(customerId)
    );

  if (!customer) return;

  document.getElementById("paymentPanel")
    .classList.remove("hidden");

  document.getElementById("paymentCustomerId").value =
    customer.id;

  document.getElementById("paymentTitle").textContent =
    "Payment - " + customer.name;

  document.getElementById("paymentAmount").value = "";

  document.getElementById("paymentNote").value = "";

  document.getElementById("paymentDate").value =
    new Date().toISOString().split("T")[0];

  renderPayments(customer.id);

  document.getElementById("paymentPanel")
    .scrollIntoView({
      behavior: "smooth"
    });
}

function closePayment() {
  document.getElementById("paymentPanel")
    .classList.add("hidden");
}

async function savePayment() {

  const customerId =
    document.getElementById("paymentCustomerId").value;

  const amount =
    Number(
      document.getElementById("paymentAmount").value
    );

  const date =
    document.getElementById("paymentDate").value;

  const note =
    document.getElementById("paymentNote").value.trim();

  if (!customerId) {
    alert("Customer not selected.");
    return;
  }

  if (!amount || amount <= 0) {
    alert("Enter a valid payment amount.");
    return;
  }

  const customer =
    customers.find(
      c => String(c.id) === String(customerId)
    );

  if (!customer) return;

  const balance =
    customerBalance(customer);

  if (amount > balance) {
    alert(
      "Payment is greater than balance.\n\n" +
      "Balance: " +
      formatMoney(balance)
    );
    return;
  }

  try {

    const result =
      await supabaseClient
        .from("payments")
        .insert([{
          customer_id: customerId,
          amount: amount,
          payment_date: date,
          note: note
        }]);

    if (result.error) {
      throw result.error;
    }

    alert("Payment saved successfully.");

    document.getElementById("paymentAmount").value = "";
    document.getElementById("paymentNote").value = "";

    await loadAllData();

    renderPayments(customerId);

  } catch (error) {

    console.error(error);

    alert(
      "Payment save failed:\n" +
      error.message
    );
  }
}

function renderPayments(customerId) {

  const tbody =
    document.getElementById("paymentTable");

  const customerPayments =
    payments.filter(
      p => String(p.customer_id) === String(customerId)
    );

  tbody.innerHTML = "";

  if (customerPayments.length === 0) {

    tbody.innerHTML =
      `<tr>
        <td colspan="4" style="text-align:center">
          No payments yet
        </td>
      </tr>`;

    return;
  }

  customerPayments.forEach(payment => {

    const row =
      document.createElement("tr");

    row.innerHTML = `
      <td>${payment.payment_date || ""}</td>

      <td>
        <strong>${formatMoney(payment.amount)}</strong>
      </td>

      <td>${escapeHtml(payment.note || "")}</td>

      <td>
        <button
          class="action-btn delete-btn"
          onclick="deletePayment('${payment.id}')">
          Delete
        </button>
      </td>
    `;

    tbody.appendChild(row);
  });
}

async function deletePayment(id) {

  const ok =
    confirm("Delete this payment?");

  if (!ok) return;

  try {

    const result =
      await supabaseClient
        .from("payments")
        .delete()
        .eq("id", id);

    if (result.error) {
      throw result.error;
    }

    await loadAllData();

  } catch (error) {

    console.error(error);

    alert(
      "Payment delete failed:\n" +
      error.message
    );
  }
}

function updateDashboard() {

  const totalCustomers =
    customers.length;

  const totalLoan =
    customers.reduce(
      (sum, c) =>
        sum + Number(c.loan_amount || 0),
      0
    );

  const totalPayable =
    customers.reduce(
      (sum, c) =>
        sum + calculateTotal(c),
      0
    );

  const totalCollected =
    payments.reduce(
      (sum, p) =>
        sum + Number(p.amount || 0),
      0
    );

  const balance =
    Math.max(
      0,
      totalPayable - totalCollected
    );

  const today =
    new Date().toISOString().split("T")[0];

  const todayCollection =
    payments
      .filter(p =>
        p.payment_date === today
      )
      .reduce(
        (sum, p) =>
          sum + Number(p.amount || 0),
        0
      );

  const now =
    new Date();

  const month =
    now.getMonth();

  const year =
    now.getFullYear();

  const monthCollection =
    payments
      .filter(p => {

        if (!p.payment_date) return false;

        const d =
          new Date(p.payment_date);

        return (
          d.getMonth() === month &&
          d.getFullYear() === year
        );
      })
      .reduce(
        (sum, p) =>
          sum + Number(p.amount || 0),
        0
      );

  document.getElementById("totalCustomers")
    .textContent = totalCustomers;

  document.getElementById("totalLoan")
    .textContent = formatMoney(totalLoan);

  document.getElementById("totalCollected")
    .textContent = formatMoney(totalCollected);

  document.getElementById("totalBalance")
    .textContent = formatMoney(balance);

  document.getElementById("todayCollection")
    .textContent = formatMoney(todayCollection);

  document.getElementById("monthCollection")
    .textContent = formatMoney(monthCollection);
}

function escapeHtml(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}