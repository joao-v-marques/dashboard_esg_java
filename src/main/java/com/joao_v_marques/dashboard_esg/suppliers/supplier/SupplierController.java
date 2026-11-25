package com.joao_v_marques.dashboard_esg.suppliers.supplier;

import com.joao_v_marques.dashboard_esg.suppliers.supplier.dto.SupplierResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/suppliers")
public class SupplierController {

    private final SupplierService service;

    public SupplierController(SupplierService service) {
        this.service = service;
    }

    @GetMapping
    public List<SupplierResponse> findAll() {
        return service.findAll();
    }
}
