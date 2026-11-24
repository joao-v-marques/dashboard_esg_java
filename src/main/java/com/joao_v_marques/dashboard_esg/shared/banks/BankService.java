package com.joao_v_marques.dashboard_esg.shared.banks;

import com.joao_v_marques.dashboard_esg.shared.banks.dto.BankResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class BankService {

    private final BankRepository repository;

    public BankService(BankRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<BankResponse> findAll() {
        return repository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private BankResponse toResponse(Bank bank) {
        return new BankResponse(
                bank.getId(),
                bank.getCode(),
                bank.getName(),
                bank.isActive()
        );
    }
}
